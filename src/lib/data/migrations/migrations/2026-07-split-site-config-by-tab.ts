import {
  serializeDataJson,
  type DataMigration,
} from "@/src/lib/data/migrations/types";
import { siteConfigSchema } from "@/src/schemas/site-config";
import {
  SITE_CONFIG_META_PATH,
  SITE_CONFIG_TAB_IDS,
  SITE_CONFIG_TAB_PATHS,
  splitSiteConfig,
} from "@/src/schemas/site-config-tabs";

const LEGACY_SITE_PATH = "configuracoes/site.json";

/**
 * Split monolith `configuracoes/site.json` into per-tab fragment files.
 * Idempotent when fragments already exist and legacy file is gone.
 */
export const migrationSplitSiteConfigByTab: DataMigration = {
  id: "2026-07-split-site-config-by-tab",
  order: 20,
  description:
    "Divide configuracoes/site.json em meta + um JSON por aba do admin",
  async run(ctx) {
    const legacyRaw = await ctx.readJson<unknown>(LEGACY_SITE_PATH);
    const metaExisting = await ctx.readJson<unknown>(SITE_CONFIG_META_PATH);

    if (legacyRaw == null) {
      return {
        changes: [],
        stats: {
          skipped: metaExisting != null ? "already-split" : "no-site-config",
        },
      };
    }

    const parsed = siteConfigSchema.safeParse(legacyRaw);
    if (!parsed.success) {
      throw new Error(
        `[migrations] ${LEGACY_SITE_PATH}: ${JSON.stringify(parsed.error.flatten())}`,
      );
    }

    const fragments = splitSiteConfig(parsed.data);
    const changes = [
      {
        path: SITE_CONFIG_META_PATH,
        content: serializeDataJson(fragments.meta),
        encoding: "utf-8" as const,
      },
      ...SITE_CONFIG_TAB_IDS.map((tab) => ({
        path: SITE_CONFIG_TAB_PATHS[tab],
        content: serializeDataJson(fragments[tab]),
        encoding: "utf-8" as const,
      })),
      { path: LEGACY_SITE_PATH, delete: true as const },
    ];

    return {
      changes,
      stats: {
        fragments: SITE_CONFIG_TAB_IDS.length + 1,
        deletedLegacy: 1,
      },
    };
  },
};
