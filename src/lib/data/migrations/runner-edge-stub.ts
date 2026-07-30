import type {
  MigrationRunSummary,
  MigrationTrigger,
} from "@/src/lib/data/migrations/types";

/** No-op stub so Edge instrumentation bundles do not pull Node fs/path. */
export async function runDataMigrations(_options: {
  trigger: MigrationTrigger;
  dryRun?: boolean;
}): Promise<MigrationRunSummary> {
  return { applied: [], skipped: [], dryRun: _options.dryRun ?? false };
}
