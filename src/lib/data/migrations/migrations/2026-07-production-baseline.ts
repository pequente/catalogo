import {
  applyProductionBaselineToProduct,
  applyProductionBaselineToSite,
} from "@/src/lib/data/migrations/production-model";
import {
  fileChangeIfMigrated,
  mapJsonDir,
  type DataMigration,
} from "@/src/lib/data/migrations/types";

const SITE_PATH = "configuracoes/site.json";

/**
 * Initial migration: production on-disk model → current `SiteConfig` / `Product` schemas.
 */
export const migrationProductionBaseline: DataMigration = {
  id: "2026-07-production-baseline",
  order: 10,
  description:
    "Converte catálogo modelo produção (data-dev) para schema atual: variantes, site.json, WA parts",
  async run(ctx) {
    const productChanges = await mapJsonDir(ctx, "produtos", (relativePath, raw) =>
      fileChangeIfMigrated(
        relativePath,
        raw,
        applyProductionBaselineToProduct(raw),
      ),
    );

    const siteRaw = await ctx.readJson<unknown>(SITE_PATH);
    const siteChanges =
      siteRaw === null
        ? []
        : (() => {
            const migrated = applyProductionBaselineToSite(siteRaw);
            const change = fileChangeIfMigrated(SITE_PATH, siteRaw, migrated);
            return change ? [change] : [];
          })();

    const changes = [...productChanges, ...siteChanges];
    return {
      changes,
      stats: {
        produtos: productChanges.length,
        site: siteChanges.length,
      },
    };
  },
};
