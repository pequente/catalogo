import { z } from "zod";
import { isoDateSchema } from "./common";
import {
  siteComportamentoSchema,
  siteHexColorSchema,
  siteRotulosSchema,
  siteSeoSchema,
  siteTemaSchema,
  siteTextosCarrinhoSchema,
  siteTextosCatalogoSchema,
  siteTextosCookiesSchema,
  siteTextosHomeSchema,
  siteTextosLeadModalSchema,
  siteTextosPaginasSchema,
  siteTextosProdutoSchema,
  siteTextosRodapeSchema,
  siteVitrineSchema,
} from "@/src/schemas/site-personalization";
import {
  siteConfigSchema,
  siteInstagramSchema,
  siteLayoutSchema,
  siteLogoInputSchema,
  siteLogoSchema,
  type SiteConfig,
} from "@/src/schemas/site-config";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import { DEFAULT_NAVEGACAO, siteNavegacaoSchema } from "@/src/schemas/navigation";
import { normalizeWhatsappTemplates } from "@/src/lib/wa-whatsapp-normalize";
import {
  cartWaTemplatePartsSchema,
  compactCartItemPartsSchema,
  productWaTemplatePartsSchema,
} from "@/src/lib/wa-template-validation";

/** Tab ids aligned with admin Configurações UI. */
export const SITE_CONFIG_TAB_IDS = [
  "geral",
  "whatsapp",
  "contato",
  "vitrine",
  "navegacao",
  "textos",
  "tema",
] as const;

export type SiteConfigTabId = (typeof SITE_CONFIG_TAB_IDS)[number];

export const siteConfigTabIdSchema = z.enum(SITE_CONFIG_TAB_IDS);

export const SITE_CONFIG_META_PATH = "configuracoes/meta.json";

export const SITE_CONFIG_TAB_PATHS: Record<SiteConfigTabId, string> = {
  geral: "configuracoes/geral.json",
  whatsapp: "configuracoes/whatsapp.json",
  contato: "configuracoes/contato.json",
  vitrine: "configuracoes/vitrine.json",
  navegacao: "configuracoes/navegacao.json",
  textos: "configuracoes/textos.json",
  tema: "configuracoes/tema.json",
};

export const SITE_CONFIG_FRAGMENT_PATHS = [
  SITE_CONFIG_META_PATH,
  ...Object.values(SITE_CONFIG_TAB_PATHS),
] as const;

/**
 * Tabs written on a partial update: patched tabs plus missing/invalid ones to heal.
 * Valid untouched tabs are left on disk (isolation between abas).
 */
export function siteConfigTabsToPersist(
  touched: Iterable<SiteConfigTabId>,
  fallbackTabs: Iterable<SiteConfigTabId> = [],
): SiteConfigTabId[] {
  return [...new Set([...touched, ...fallbackTabs])];
}

export const siteConfigMetaSchema = z.object({
  versao: z.number().int().min(1),
  atualizadoEm: isoDateSchema,
});

export const siteGeralFragmentSchema = z.object({
  nomeLoja: z.string().min(1),
  mostrarNomeComLogo: z.boolean().default(false),
  mostrarCarrinho: z.boolean().default(true),
  assinatura: z.string().min(1),
  slogan: z.string().min(1),
  cores: z.object({
    primaria: siteHexColorSchema,
    secundaria: siteHexColorSchema,
    fundo: siteHexColorSchema,
    fundoNeutro: siteHexColorSchema,
    borda: siteHexColorSchema,
  }),
  logo: siteLogoSchema.nullable().optional(),
  metaReceitaMensal: z.number().min(0).nullable().default(null),
});

/** Geral write payload — logo may be pending upload. */
export const siteGeralUpdateSchema = siteGeralFragmentSchema
  .omit({ logo: true })
  .extend({
    logo: siteLogoInputSchema.nullable().optional(),
  });

export const siteWhatsappFragmentSchema = z.object({
  whatsapp: z
    .object({
      telefone: z.string().min(8),
      mensagemPadrao: z.string(),
      mensagemProdutoParts: productWaTemplatePartsSchema.optional(),
      mensagemProduto: z.string().optional(),
      mensagemProdutoIncluirReferencia: z.boolean().default(false),
      mensagemProdutoFormatoItens: z
        .enum(["produto", "compacto"])
        .default("produto"),
      mensagemProdutoItemCompactoParts: compactCartItemPartsSchema.optional(),
      mostrar: z.boolean().default(true),
      mensagemCarrinhoFormatoItens: z
        .enum(["produto", "compacto"])
        .default("produto"),
      mensagemCarrinhoParts: cartWaTemplatePartsSchema.optional(),
      mensagemCarrinho: z.string().optional(),
      mensagemCarrinhoItemCompactoParts: compactCartItemPartsSchema.optional(),
      mensagemCarrinhoItemCompacto: z.string().optional(),
    })
    .transform(normalizeWhatsappTemplates),
  comportamento: siteComportamentoSchema,
});

export const siteContatoFragmentSchema = z.object({
  instagram: siteInstagramSchema,
  endereco: z.object({
    cep: z.string().default(""),
    logradouro: z.string().default(""),
    numero: z.string().default(""),
    complemento: z.string().default(""),
    bairro: z.string().default(""),
    cidade: z.string(),
    uf: z.string(),
    texto: z.string(),
    mostrar: z.boolean().default(true),
  }),
  telefones: z
    .object({
      fixo: z.string().default(""),
      celular: z.string().default(""),
      usarWhatsappComoCelular: z.boolean().default(true),
      mostrarFixo: z.boolean().default(false),
      mostrarCelular: z.boolean().default(true),
    })
    .default({
      fixo: "",
      celular: "",
      usarWhatsappComoCelular: true,
      mostrarFixo: false,
      mostrarCelular: true,
    }),
  horarios: z.string(),
  /** Legacy owner of institutional copy; kept readable during migration. */
  textos: z
    .object({
      sobre: z.string(),
      trocas: z.string(),
    })
    .optional(),
});

export const siteVitrineFragmentSchema = z.object({
  layout: siteLayoutSchema.default("classic"),
  vitrine: siteVitrineSchema,
});

export const siteNavegacaoFragmentSchema = z.object({
  navegacao: siteNavegacaoSchema.default(DEFAULT_NAVEGACAO),
});

export const siteTextosFragmentSchema = z.object({
  textos: z.object({
    /** Optional when reading fragments created before copy moved from Contato. */
    sobre: z.string().optional(),
    trocas: z.string().optional(),
    paginas: siteTextosPaginasSchema,
    home: siteTextosHomeSchema,
    catalogo: siteTextosCatalogoSchema,
    produto: siteTextosProdutoSchema,
    rodape: siteTextosRodapeSchema,
    cookies: siteTextosCookiesSchema,
    leadModal: siteTextosLeadModalSchema,
    carrinho: siteTextosCarrinhoSchema,
  }),
  rotulos: siteRotulosSchema,
});

export const siteTemaFragmentSchema = z.object({
  tema: siteTemaSchema,
  seo: siteSeoSchema,
});

export const SITE_CONFIG_TAB_SCHEMAS = {
  geral: siteGeralFragmentSchema,
  whatsapp: siteWhatsappFragmentSchema,
  contato: siteContatoFragmentSchema,
  vitrine: siteVitrineFragmentSchema,
  navegacao: siteNavegacaoFragmentSchema,
  textos: siteTextosFragmentSchema,
  tema: siteTemaFragmentSchema,
} as const;

export type SiteConfigMeta = z.infer<typeof siteConfigMetaSchema>;
export type SiteGeralFragment = z.infer<typeof siteGeralFragmentSchema>;
export type SiteWhatsappFragment = z.infer<typeof siteWhatsappFragmentSchema>;
export type SiteContatoFragment = z.infer<typeof siteContatoFragmentSchema>;
export type SiteVitrineFragment = z.infer<typeof siteVitrineFragmentSchema>;
export type SiteNavegacaoFragment = z.infer<typeof siteNavegacaoFragmentSchema>;
export type SiteTextosFragment = z.infer<typeof siteTextosFragmentSchema>;
export type SiteTemaFragment = z.infer<typeof siteTemaFragmentSchema>;

export type SiteConfigTabFragment = {
  geral: SiteGeralFragment;
  whatsapp: SiteWhatsappFragment;
  contato: SiteContatoFragment;
  vitrine: SiteVitrineFragment;
  navegacao: SiteNavegacaoFragment;
  textos: SiteTextosFragment;
  tema: SiteTemaFragment;
};

export type SiteConfigFragments = {
  meta: SiteConfigMeta;
} & SiteConfigTabFragment;

/** Split a full SiteConfig into on-disk fragments. */
export function splitSiteConfig(config: SiteConfig): SiteConfigFragments {
  return {
    meta: {
      versao: config.versao,
      atualizadoEm: config.atualizadoEm,
    },
    geral: {
      nomeLoja: config.nomeLoja,
      mostrarNomeComLogo: config.mostrarNomeComLogo,
      mostrarCarrinho: config.mostrarCarrinho,
      assinatura: config.assinatura,
      slogan: config.slogan,
      cores: config.cores,
      logo: config.logo ?? null,
      metaReceitaMensal: config.metaReceitaMensal ?? null,
    },
    whatsapp: {
      whatsapp: config.whatsapp,
      comportamento: config.comportamento,
    },
    contato: {
      instagram: config.instagram,
      endereco: config.endereco,
      telefones: config.telefones,
      horarios: config.horarios,
    },
    vitrine: {
      layout: config.layout,
      vitrine: config.vitrine,
    },
    navegacao: {
      navegacao: config.navegacao ?? DEFAULT_NAVEGACAO,
    },
    textos: {
      textos: {
        sobre: config.textos.sobre,
        trocas: config.textos.trocas,
        paginas: config.textos.paginas,
        home: config.textos.home,
        catalogo: config.textos.catalogo,
        produto: config.textos.produto,
        rodape: config.textos.rodape,
        cookies: config.textos.cookies,
        leadModal: config.textos.leadModal,
        carrinho: config.textos.carrinho,
      },
      rotulos: config.rotulos,
    },
    tema: {
      tema: config.tema,
      seo: config.seo,
    },
  };
}

/** Merge on-disk fragments into a raw object suitable for `siteConfigSchema`. */
export function composeSiteConfigRaw(fragments: SiteConfigFragments): unknown {
  const { meta, geral, whatsapp, contato, vitrine, navegacao, textos, tema } =
    fragments;
  return {
    versao: meta.versao,
    atualizadoEm: meta.atualizadoEm,
    ...geral,
    ...whatsapp,
    instagram: contato.instagram,
    endereco: contato.endereco,
    telefones: contato.telefones,
    horarios: contato.horarios,
    layout: vitrine.layout,
    vitrine: vitrine.vitrine,
    navegacao: navegacao.navegacao,
    textos: {
      sobre:
        textos.textos.sobre ??
        contato.textos?.sobre ??
        DEFAULT_SITE_CONFIG.textos.sobre,
      trocas:
        textos.textos.trocas ??
        contato.textos?.trocas ??
        DEFAULT_SITE_CONFIG.textos.trocas,
      ...textos.textos,
    },
    rotulos: textos.rotulos,
    tema: tema.tema,
    seo: tema.seo,
  };
}

export function parseTabFragment<T extends SiteConfigTabId>(
  tab: T,
  raw: unknown,
): SiteConfigTabFragment[T] {
  return SITE_CONFIG_TAB_SCHEMAS[tab].parse(raw) as SiteConfigTabFragment[T];
}

/** Extract the tab slice from a full SiteConfig (for API responses). */
export function extractTabSlice<T extends SiteConfigTabId>(
  config: SiteConfig,
  tab: T,
): SiteConfigTabFragment[T] {
  const fragments = splitSiteConfig(config);
  return fragments[tab];
}

/** Merge a tab slice into a full SiteConfig (client-side hydrate). */
export function mergeTabIntoConfig(
  config: SiteConfig,
  tab: SiteConfigTabId,
  slice: SiteConfigTabFragment[SiteConfigTabId],
  meta?: Partial<SiteConfigMeta>,
): SiteConfig {
  const next = { ...config };
  if (meta?.versao != null) next.versao = meta.versao;
  if (meta?.atualizadoEm != null) next.atualizadoEm = meta.atualizadoEm;

  switch (tab) {
    case "geral": {
      const s = slice as SiteGeralFragment;
      return {
        ...next,
        nomeLoja: s.nomeLoja,
        mostrarNomeComLogo: s.mostrarNomeComLogo,
        mostrarCarrinho: s.mostrarCarrinho,
        assinatura: s.assinatura,
        slogan: s.slogan,
        cores: s.cores,
        logo: s.logo ?? null,
        metaReceitaMensal: s.metaReceitaMensal ?? null,
      };
    }
    case "whatsapp": {
      const s = slice as SiteWhatsappFragment;
      return {
        ...next,
        whatsapp: s.whatsapp,
        comportamento: s.comportamento,
      };
    }
    case "contato": {
      const s = slice as SiteContatoFragment;
      return {
        ...next,
        instagram: s.instagram,
        endereco: s.endereco,
        telefones: s.telefones,
        horarios: s.horarios,
        ...(s.textos
          ? {
              textos: {
                ...next.textos,
                sobre: s.textos.sobre,
                trocas: s.textos.trocas,
              },
            }
          : {}),
      };
    }
    case "vitrine": {
      const s = slice as SiteVitrineFragment;
      return {
        ...next,
        layout: s.layout,
        vitrine: s.vitrine,
      };
    }
    case "navegacao": {
      const s = slice as SiteNavegacaoFragment;
      return {
        ...next,
        navegacao: s.navegacao,
      };
    }
    case "textos": {
      const s = slice as SiteTextosFragment;
      return {
        ...next,
        textos: {
          ...next.textos,
          ...s.textos,
        },
        rotulos: s.rotulos,
      };
    }
    case "tema": {
      const s = slice as SiteTemaFragment;
      return {
        ...next,
        tema: s.tema,
        seo: s.seo,
      };
    }
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

export type SiteConfigTabApiResponse<T extends SiteConfigTabId = SiteConfigTabId> = {
  tab: T;
  versao: number;
  atualizadoEm: string;
  data: SiteConfigTabFragment[T];
};

function fragmentsToConfig(fragments: SiteConfigFragments): SiteConfig {
  const parsed = siteConfigSchema.safeParse(composeSiteConfigRaw(fragments));
  if (!parsed.success) {
    console.warn(
      "[site-config] compose invalid, using defaults",
      parsed.error.flatten(),
    );
    return {
      ...DEFAULT_SITE_CONFIG,
      versao: fragments.meta.versao,
      atualizadoEm: fragments.meta.atualizadoEm,
    };
  }
  return parsed.data;
}

/**
 * Prefer tab fragments when present (canonical post-split storage).
 * Legacy `site.json` is only used when fragments have not been migrated yet.
 * Successful fragment writes delete the monolith so both never linger.
 */
export function pickSiteConfigSource(opts: {
  legacy: SiteConfig | null;
  fragments: SiteConfigFragments | null;
}): SiteConfig {
  if (opts.fragments) return fragmentsToConfig(opts.fragments);
  if (opts.legacy) return opts.legacy;
  return DEFAULT_SITE_CONFIG;
}
