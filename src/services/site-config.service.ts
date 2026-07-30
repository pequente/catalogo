import "server-only";
import { cache } from "react";
import { commitFiles, readBinary, readJson } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import { syncEnderecoTexto } from "@/src/lib/br/endereco";
import { normalizeWaDigits } from "@/src/lib/wa";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import {
  siteConfigSchema,
  siteLogoSchema,
  type SiteConfig,
  type SiteLogo,
  type siteConfigUpdateSchema,
  type siteLogoInputSchema,
} from "@/src/schemas/site-config";
import { DEFAULT_NAVEGACAO, siteNavegacaoSchema } from "@/src/schemas/navigation";
import {
  extractTabSlice,
  parseTabFragment,
  pickSiteConfigSource,
  SITE_CONFIG_META_PATH,
  SITE_CONFIG_TAB_IDS,
  SITE_CONFIG_TAB_PATHS,
  siteConfigMetaSchema,
  siteConfigTabsToPersist,
  siteGeralFragmentSchema,
  siteGeralUpdateSchema,
  splitSiteConfig,
  type SiteConfigFragments,
  type SiteConfigMeta,
  type SiteConfigTabApiResponse,
  type SiteConfigTabFragment,
  type SiteConfigTabId,
} from "@/src/schemas/site-config-tabs";
import {
  prepareImageBinary,
  type PendingBinary,
} from "@/src/services/upload.service";
import type { z } from "zod";

/** Legacy monolith path — migration removes this. */
export const LEGACY_SITE_CONFIG_PATH = "configuracoes/site.json";

export { DEFAULT_SITE_CONFIG };

type LogoInput = z.infer<typeof siteLogoInputSchema>;

export type SiteBranding = {
  nomeLoja: string;
  logo: SiteLogo | null;
};

export type SiteConfigTabResponse<T extends SiteConfigTabId = SiteConfigTabId> =
  SiteConfigTabApiResponse<T>;

async function resolveLogo(
  logo: LogoInput,
  pendingBinaries: Map<string, PendingBinary>,
  fallbackAlt: string,
): Promise<{
  logo: SiteLogo;
  binaryWrites: { path: string; bytes: Buffer }[];
}> {
  const pending = pendingBinaries.get(logo.id);
  if (pending || logo.pending) {
    if (!pending) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Arquivo pendente não enviado para a logo",
        400,
      );
    }
    const prepared = prepareImageBinary(pending, "site", logo.id);
    return {
      logo: siteLogoSchema.parse({
        id: prepared.id,
        path: prepared.path,
        alt: logo.alt?.trim() || fallbackAlt,
      }),
      binaryWrites: [{ path: prepared.path, bytes: prepared.bytes }],
    };
  }

  const bytes = await readBinary(logo.path);
  if (!bytes) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Logo não encontrada. Selecione o arquivo novamente.",
      400,
    );
  }
  return {
    logo: siteLogoSchema.parse({
      id: logo.id,
      path: logo.path,
      alt: logo.alt?.trim() || fallbackAlt,
    }),
    binaryWrites: [],
  };
}

function applyWhatsappTemplateMigrations(config: SiteConfig): SiteConfig {
  const parsed = siteConfigSchema.safeParse(config);
  if (!parsed.success) return config;
  return parsed.data;
}

async function readMeta(): Promise<SiteConfigMeta | null> {
  let raw: unknown;
  try {
    raw = await readJson<unknown>(SITE_CONFIG_META_PATH);
  } catch (e) {
    console.warn("[site-config] meta.json read failed", e);
    return null;
  }
  if (!raw) return null;
  const parsed = siteConfigMetaSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn("[site-config] invalid meta.json", parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

/** Canonical optimistic-lock version (matches tab GET / meta.json). */
async function readSiteConfigVersao(): Promise<number> {
  const meta = await readMeta();
  if (meta) return meta.versao;
  const legacy = await readLegacySiteConfig();
  if (legacy) return legacy.versao;
  return DEFAULT_SITE_CONFIG.versao;
}

type FragmentsLoad = {
  fragments: SiteConfigFragments;
  fallbackTabs: SiteConfigTabId[];
};

async function readTabFragmentSafe<T extends SiteConfigTabId>(
  tab: T,
  defaults: SiteConfigFragments,
): Promise<{ data: SiteConfigTabFragment[T]; usedFallback: boolean }> {
  try {
    const raw = await readJson<unknown>(SITE_CONFIG_TAB_PATHS[tab]);
    if (raw == null) {
      console.warn(
        `[site-config] missing ${SITE_CONFIG_TAB_PATHS[tab]}, using defaults`,
      );
      return { data: defaults[tab], usedFallback: true };
    }
    try {
      return { data: parseTabFragment(tab, raw), usedFallback: false };
    } catch (e) {
      console.warn(`[site-config] invalid ${SITE_CONFIG_TAB_PATHS[tab]}`, e);
      return { data: defaults[tab], usedFallback: true };
    }
  } catch (e) {
    // Storage/network/parse errors must not take down admin SSR.
    console.warn(`[site-config] read failed ${SITE_CONFIG_TAB_PATHS[tab]}`, e);
    return { data: defaults[tab], usedFallback: true };
  }
}

/**
 * Load meta + all tab files. Missing/invalid tabs fall back to defaults
 * instead of discarding the entire config.
 */
async function readAllFragments(): Promise<FragmentsLoad | null> {
  const meta = await readMeta();
  if (!meta) return null;

  const defaults = splitSiteConfig(DEFAULT_SITE_CONFIG);
  const fallbackTabs: SiteConfigTabId[] = [];
  const fragments = { meta } as SiteConfigFragments;

  await Promise.all(
    SITE_CONFIG_TAB_IDS.map(async (tab) => {
      const { data, usedFallback } = await readTabFragmentSafe(tab, defaults);
      fragments[tab] = data as never;
      if (usedFallback) fallbackTabs.push(tab);
    }),
  );

  return { fragments, fallbackTabs };
}

async function legacyDeleteIfPresent(deletes: string[]): Promise<string[]> {
  const legacy = await readJson<unknown>(LEGACY_SITE_CONFIG_PATH);
  if (legacy == null) return deletes;
  if (deletes.includes(LEGACY_SITE_CONFIG_PATH)) return deletes;
  return [...deletes, LEGACY_SITE_CONFIG_PATH];
}

function fragmentJsonWrites(fragments: SiteConfigFragments) {
  return [
    { path: SITE_CONFIG_META_PATH, data: fragments.meta },
    ...SITE_CONFIG_TAB_IDS.map((tab) => ({
      path: SITE_CONFIG_TAB_PATHS[tab],
      data: fragments[tab],
    })),
  ];
}

async function readLegacySiteConfig(): Promise<SiteConfig | null> {
  let legacy: unknown;
  try {
    legacy = await readJson<unknown>(LEGACY_SITE_CONFIG_PATH);
  } catch (e) {
    console.warn("[site-config] legacy site.json read failed", e);
    return null;
  }
  if (!legacy) return null;
  const parsed = siteConfigSchema.safeParse(legacy);
  if (!parsed.success) {
    console.warn(
      "[site-config] invalid legacy site.json, ignoring",
      parsed.error.flatten(),
    );
    return null;
  }
  return applyWhatsappTemplateMigrations(parsed.data);
}

export const getSiteConfig = cache(async (): Promise<SiteConfig> => {
  const [legacy, loaded] = await Promise.all([
    readLegacySiteConfig(),
    readAllFragments(),
  ]);
  const fragments = loaded?.fragments ?? null;
  if (legacy && fragments) {
    console.warn(
      "[site-config] site.json and fragments both present; preferring fragments (legacy will be removed on next save)",
    );
  }
  return pickSiteConfigSource({ legacy, fragments });
});

export const getSiteBranding = cache(async (): Promise<SiteBranding> => {
  const legacy = await readLegacySiteConfig();
  if (legacy) {
    return {
      nomeLoja: legacy.nomeLoja,
      logo: legacy.logo ?? null,
    };
  }

  try {
    const raw = await readJson<unknown>(SITE_CONFIG_TAB_PATHS.geral);
    if (raw) {
      const parsed = siteGeralFragmentSchema.safeParse(raw);
      if (parsed.success) {
        return {
          nomeLoja: parsed.data.nomeLoja,
          logo: parsed.data.logo ?? null,
        };
      }
    }
  } catch (e) {
    console.warn("[site-config] geral branding read failed", e);
  }

  const full = await getSiteConfig();
  return {
    nomeLoja: full.nomeLoja,
    logo: full.logo ?? null,
  };
});

/**
 * Lazy tab read: only meta + the requested fragment (not all 7 tabs).
 * Critical on DATA_BACKEND=github to keep admin SSR within budget/timeouts.
 */
export async function getSiteConfigTab<T extends SiteConfigTabId>(
  tab: T,
): Promise<SiteConfigTabResponse<T>> {
  const meta = await readMeta();

  if (meta) {
    const defaults = splitSiteConfig(DEFAULT_SITE_CONFIG);
    const { data } = await readTabFragmentSafe(tab, defaults);
    return {
      tab,
      versao: meta.versao,
      atualizadoEm: meta.atualizadoEm,
      data,
    };
  }

  try {
    const legacy = await readLegacySiteConfig();
    if (legacy) {
      return {
        tab,
        versao: legacy.versao,
        atualizadoEm: legacy.atualizadoEm,
        data: extractTabSlice(legacy, tab),
      };
    }
  } catch (e) {
    console.warn("[site-config] getSiteConfigTab legacy failed", e);
  }

  const full = await getSiteConfig();
  return {
    tab,
    versao: full.versao,
    atualizadoEm: full.atualizadoEm,
    data: extractTabSlice(full, tab),
  };
}

function normalizePhoneFields(config: SiteConfig): void {
  config.whatsapp.telefone = normalizeWaDigits(config.whatsapp.telefone);
  config.telefones.fixo = normalizeWaDigits(config.telefones.fixo);
  config.telefones.celular = normalizeWaDigits(config.telefones.celular);
}

async function commitSiteFragments(
  fragments: SiteConfigFragments,
  binaryWrites: { path: string; bytes: Buffer }[],
  deletes: string[],
  message: string,
): Promise<void> {
  const deletesWithLegacy = await legacyDeleteIfPresent(deletes);
  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites: fragmentJsonWrites(fragments),
      deletes: deletesWithLegacy,
    }),
    message,
  );
  revalidateStorefront(
    CACHE_TAGS.siteConfig,
    CACHE_TAGS.media,
    CACHE_TAGS.dashboard,
  );
}

export async function updateSiteConfig(
  input: z.infer<typeof siteConfigUpdateSchema>,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<SiteConfig> {
  const expectedVersao = await readSiteConfigVersao();
  if (expectedVersao !== input.versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }

  const current = await getSiteConfig();
  const { versao: _ignoredVersao, logo: inputLogo, ...rest } = input;
  void _ignoredVersao;

  let logo = current.logo ?? null;
  let binaryWrites: { path: string; bytes: Buffer }[] = [];
  const deletes: string[] = [];

  if (inputLogo === null) {
    if (current.logo?.path) deletes.push(current.logo.path);
    logo = null;
  } else if (inputLogo) {
    const fallbackAlt = rest.nomeLoja?.trim() || current.nomeLoja;
    const resolved = await resolveLogo(inputLogo, pendingBinaries, fallbackAlt);
    logo = resolved.logo;
    binaryWrites = resolved.binaryWrites;
    if (current.logo?.path && current.logo.path !== logo.path) {
      deletes.push(current.logo.path);
    }
  }

  const updated: SiteConfig = {
    ...current,
    ...rest,
    cores: { ...current.cores, ...(rest.cores ?? {}) },
    whatsapp: { ...current.whatsapp, ...(rest.whatsapp ?? {}) },
    instagram: { ...current.instagram, ...(rest.instagram ?? {}) },
    endereco: syncEnderecoTexto({
      ...current.endereco,
      ...(rest.endereco ?? {}),
    }),
    telefones: { ...current.telefones, ...(rest.telefones ?? {}) },
    textos: { ...current.textos, ...(rest.textos ?? {}) },
    navegacao: rest.navegacao
      ? siteNavegacaoSchema.parse(rest.navegacao)
      : (current.navegacao ?? DEFAULT_NAVEGACAO),
    metaReceitaMensal:
      rest.metaReceitaMensal !== undefined
        ? rest.metaReceitaMensal
        : (current.metaReceitaMensal ?? null),
    logo,
    versao: expectedVersao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  normalizePhoneFields(updated);
  const validated = siteConfigSchema.parse(updated);
  const fragments = splitSiteConfig(validated);

  await commitSiteFragments(
    fragments,
    binaryWrites,
    deletes,
    "chore(data): update site config",
  );
  return validated;
}

type TabPatchInput = {
  tab: SiteConfigTabId;
  data: unknown;
};

/**
 * Atomically update one or more tab fragments in a single commit.
 * `versao` is checked once against meta and bumped once.
 */
export async function updateSiteConfigTabs(
  versao: number,
  patches: TabPatchInput[],
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<SiteConfig> {
  if (patches.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Nenhuma aba para salvar", 400);
  }

  const expectedVersao = await readSiteConfigVersao();
  if (expectedVersao !== versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }

  const loaded = await readAllFragments();
  const fallbackTabs = loaded?.fallbackTabs ?? [];

  const current = await getSiteConfig();
  let next: SiteConfig = { ...current };
  let binaryWrites: { path: string; bytes: Buffer }[] = [];
  const deletes: string[] = [];
  const touched = new Set<SiteConfigTabId>();

  for (const patch of patches) {
    touched.add(patch.tab);

    switch (patch.tab) {
      case "geral": {
        const update = siteGeralUpdateSchema.parse(patch.data);
        const { logo: logoInput, ...base } = update;
        let logo = next.logo ?? null;
        if (logoInput === null) {
          if (next.logo?.path) deletes.push(next.logo.path);
          logo = null;
        } else if (logoInput) {
          const resolved = await resolveLogo(
            logoInput,
            pendingBinaries,
            base.nomeLoja.trim() || next.nomeLoja,
          );
          logo = resolved.logo;
          binaryWrites = [...binaryWrites, ...resolved.binaryWrites];
          if (next.logo?.path && next.logo.path !== logo.path) {
            deletes.push(next.logo.path);
          }
        }
        next = {
          ...next,
          nomeLoja: base.nomeLoja,
          mostrarNomeComLogo: base.mostrarNomeComLogo,
          mostrarCarrinho: base.mostrarCarrinho,
          assinatura: base.assinatura,
          slogan: base.slogan,
          cores: base.cores,
          metaReceitaMensal: base.metaReceitaMensal ?? null,
          logo,
        };
        break;
      }
      case "whatsapp": {
        const s = parseTabFragment("whatsapp", patch.data);
        next = {
          ...next,
          whatsapp: s.whatsapp,
          comportamento: s.comportamento,
        };
        break;
      }
      case "contato": {
        const s = parseTabFragment("contato", patch.data);
        next = {
          ...next,
          instagram: s.instagram,
          endereco: syncEnderecoTexto(s.endereco),
          telefones: s.telefones,
          horarios: s.horarios,
        };
        break;
      }
      case "vitrine": {
        const s = parseTabFragment("vitrine", patch.data);
        next = {
          ...next,
          layout: s.layout,
          vitrine: s.vitrine,
        };
        break;
      }
      case "navegacao": {
        const s = parseTabFragment("navegacao", patch.data);
        next = {
          ...next,
          navegacao: siteNavegacaoSchema.parse(s.navegacao),
        };
        break;
      }
      case "textos": {
        const s = parseTabFragment("textos", patch.data);
        next = {
          ...next,
          textos: {
            ...next.textos,
            ...s.textos,
          },
          rotulos: s.rotulos,
        };
        break;
      }
      case "tema": {
        const s = parseTabFragment("tema", patch.data);
        next = {
          ...next,
          tema: s.tema,
          seo: s.seo,
        };
        break;
      }
      default: {
        const _exhaustive: never = patch.tab;
        void _exhaustive;
      }
    }
  }

  next = {
    ...next,
    versao: expectedVersao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  normalizePhoneFields(next);
  const validated = siteConfigSchema.parse(next);
  const allFragments = splitSiteConfig(validated);

  // Persist patched tabs + heal missing/invalid ones; leave valid untouched tabs alone.
  const tabsToWrite = siteConfigTabsToPersist(touched, fallbackTabs);
  const jsonWrites = [
    { path: SITE_CONFIG_META_PATH, data: allFragments.meta },
    ...tabsToWrite.map((tab) => ({
      path: SITE_CONFIG_TAB_PATHS[tab],
      data: allFragments[tab],
    })),
  ];

  const deletesWithLegacy = await legacyDeleteIfPresent(deletes);

  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites,
      deletes: deletesWithLegacy,
    }),
    `chore(data): update site config tabs (${[...touched].join(",")})`,
  );
  revalidateStorefront(
    CACHE_TAGS.siteConfig,
    CACHE_TAGS.media,
    CACHE_TAGS.dashboard,
  );
  return validated;
}

export async function updateSiteConfigTab(
  tab: SiteConfigTabId,
  versao: number,
  data: unknown,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<SiteConfig> {
  return updateSiteConfigTabs(versao, [{ tab, data }], pendingBinaries);
}
