import "server-only";
import { cache } from "react";
import { readJson } from "@/src/lib/data";
import { DASHBOARD_CATALOG_INDEX_PATH } from "@/src/lib/indices/paths";
import {
  computeDashboardCatalogFromEntries,
  DASHBOARD_CATALOG_SCHEMA_VERSION,
  dashboardCatalogIndexSchema,
  emptyDashboardCatalogIndex,
  type DashboardCatalogIndex,
} from "@/src/schemas/dashboard-catalog-index";
import { getProductIndexState } from "@/src/lib/indices/product-index-io";

/**
 * Load precomputed catalog KPIs (Fase 4).
 * Falls back to computing from the product index when the file is missing
 * or schema-outdated (e.g. before `npm run indices:rebuild`).
 */
export async function readDashboardCatalogIndex(): Promise<DashboardCatalogIndex | null> {
  const raw = await readJson<unknown>(DASHBOARD_CATALOG_INDEX_PATH);
  if (!raw) return null;

  if (
    typeof raw === "object" &&
    raw !== null &&
    "schemaVersion" in raw &&
    (raw as { schemaVersion: unknown }).schemaVersion !==
      DASHBOARD_CATALOG_SCHEMA_VERSION
  ) {
    return null;
  }

  const parsed = dashboardCatalogIndexSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[dashboard-catalog] invalid indices/dashboard-catalogo.json",
      parsed.error.flatten(),
    );
    return null;
  }
  return parsed.data;
}

/**
 * Request-scoped catalog aggregates for the admin dashboard.
 * Prefer the persisted file; rebuild in-memory from the product index if absent.
 */
export const getDashboardCatalogIndex = cache(
  async (): Promise<DashboardCatalogIndex> => {
    const existing = await readDashboardCatalogIndex();
    if (existing) return existing;

    console.warn(
      "[dashboard-catalog] missing or outdated — computing from product index (run npm run indices:rebuild to persist)",
    );
    const state = await getProductIndexState();
    if (state.entries.length === 0) {
      return emptyDashboardCatalogIndex();
    }
    return computeDashboardCatalogFromEntries(state.entries, state.updatedAt);
  },
);

export { DASHBOARD_CATALOG_INDEX_PATH };
