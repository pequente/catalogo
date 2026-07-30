import {
  serializeDataJson,
  type DataMigration,
} from "@/src/lib/data/migrations/types";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import {
  SITE_CONFIG_TAB_PATHS,
  siteGeralFragmentSchema,
  type SiteGeralFragment,
} from "@/src/schemas/site-config-tabs";

const LEGACY_IDENTIDADE_PATH = "configuracoes/identidade.json";
const LEGACY_PAINEL_PATH = "configuracoes/painel.json";
const GERAL_PATH = SITE_CONFIG_TAB_PATHS.geral;

function readMetaReceitaMensal(raw: unknown): number | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  if ("metaReceitaMensal" in record) {
    const value = record.metaReceitaMensal;
    if (value === null) return null;
    if (typeof value === "number" && value >= 0) return value;
  }
  const painel = record.painel;
  if (painel && typeof painel === "object" && !Array.isArray(painel)) {
    const meta = (painel as Record<string, unknown>).metaReceitaMensal;
    if (meta === null) return null;
    if (typeof meta === "number" && meta >= 0) return meta;
  }
  return null;
}

/**
 * Merge legacy `identidade.json` + `painel.json` into `geral.json`.
 * Idempotent when `geral.json` already exists and legacy files are gone.
 */
export const migrationMergeGeralConfigTab: DataMigration = {
  id: "2026-07-merge-geral-config-tab",
  order: 30,
  description:
    "Une identidade.json + painel.json em geral.json (aba Geral do admin)",
  async run(ctx) {
    const geralExisting = await ctx.readJson<unknown>(GERAL_PATH);
    const identidadeRaw = await ctx.readJson<unknown>(LEGACY_IDENTIDADE_PATH);
    const painelRaw = await ctx.readJson<unknown>(LEGACY_PAINEL_PATH);

    if (geralExisting != null && identidadeRaw == null && painelRaw == null) {
      return {
        changes: [],
        stats: { skipped: "already-merged" },
      };
    }

    if (geralExisting == null && identidadeRaw == null && painelRaw == null) {
      return {
        changes: [],
        stats: { skipped: "no-legacy-fragments" },
      };
    }

    const defaults = siteGeralFragmentSchema.parse({
      nomeLoja: DEFAULT_SITE_CONFIG.nomeLoja,
      mostrarNomeComLogo: DEFAULT_SITE_CONFIG.mostrarNomeComLogo,
      mostrarCarrinho: DEFAULT_SITE_CONFIG.mostrarCarrinho,
      assinatura: DEFAULT_SITE_CONFIG.assinatura,
      slogan: DEFAULT_SITE_CONFIG.slogan,
      cores: DEFAULT_SITE_CONFIG.cores,
      logo: DEFAULT_SITE_CONFIG.logo ?? null,
      metaReceitaMensal: DEFAULT_SITE_CONFIG.metaReceitaMensal,
    });

    let brand: SiteGeralFragment = defaults;
    if (geralExisting != null) {
      const parsed = siteGeralFragmentSchema.safeParse(geralExisting);
      if (parsed.success) brand = parsed.data;
    } else if (identidadeRaw != null) {
      const parsed = siteGeralFragmentSchema.safeParse({
        ...(typeof identidadeRaw === "object" &&
        identidadeRaw &&
        !Array.isArray(identidadeRaw)
          ? identidadeRaw
          : {}),
        metaReceitaMensal: null,
      });
      if (parsed.success) {
        brand = parsed.data;
      } else {
        throw new Error(
          `[migrations] ${LEGACY_IDENTIDADE_PATH}: ${JSON.stringify(parsed.error.flatten())}`,
        );
      }
    }

    const metaReceitaMensal =
      painelRaw != null
        ? readMetaReceitaMensal(painelRaw)
        : (brand.metaReceitaMensal ?? null);

    const geral = siteGeralFragmentSchema.parse({
      ...brand,
      metaReceitaMensal,
    });

    const changes = [
      {
        path: GERAL_PATH,
        content: serializeDataJson(geral),
        encoding: "utf-8" as const,
      },
      ...(identidadeRaw != null
        ? [{ path: LEGACY_IDENTIDADE_PATH, delete: true as const }]
        : []),
      ...(painelRaw != null
        ? [{ path: LEGACY_PAINEL_PATH, delete: true as const }]
        : []),
    ];

    return {
      changes,
      stats: {
        wroteGeral: 1,
        deletedIdentidade: identidadeRaw != null ? 1 : 0,
        deletedPainel: painelRaw != null ? 1 : 0,
      },
    };
  },
};
