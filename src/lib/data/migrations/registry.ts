import { migrationProductionBaseline } from "@/src/lib/data/migrations/migrations/2026-07-production-baseline";
import { migrationSplitSiteConfigByTab } from "@/src/lib/data/migrations/migrations/2026-07-split-site-config-by-tab";
import { migrationMergeGeralConfigTab } from "@/src/lib/data/migrations/migrations/2026-07-merge-geral-config-tab";
import type { DataMigration } from "@/src/lib/data/migrations/types";

/** Entity-file migrations (no server-only imports). Indices repair is appended in the runner. */
export const DATA_MIGRATIONS: DataMigration[] = [
  migrationProductionBaseline,
  migrationSplitSiteConfigByTab,
  migrationMergeGeralConfigTab,
].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function assertRegistryValid(migrations: DataMigration[]): void {
  const ids = new Set<string>();
  const orders = new Set<number>();
  for (const m of migrations) {
    if (ids.has(m.id)) {
      throw new Error(`Duplicate migration id: ${m.id}`);
    }
    ids.add(m.id);
    if (orders.has(m.order)) {
      throw new Error(`Duplicate migration order: ${m.order}`);
    }
    orders.add(m.order);
  }
}

assertRegistryValid(DATA_MIGRATIONS);
