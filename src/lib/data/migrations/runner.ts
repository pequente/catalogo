import "server-only";
import { commitFiles, listJsonDir, readJson } from "@/src/lib/data";
import { withPathLock } from "@/src/lib/data/lock";
import { migrationIndicesRepair } from "@/src/lib/indices/repair-all";
import {
  assertRegistryValid,
  DATA_MIGRATIONS,
} from "@/src/lib/data/migrations/registry";
import {
  isMigrationApplied,
  loadMigrationState,
  markMigrationApplied,
  stateFileChange,
} from "@/src/lib/data/migrations/state";
import type {
  MigrationContext,
  MigrationRunSummary,
  MigrationTrigger,
} from "@/src/lib/data/migrations/types";
import { validateMigrationFileChange } from "@/src/lib/data/migrations/validate";

const ALL_MIGRATIONS = [...DATA_MIGRATIONS, migrationIndicesRepair].sort(
  (a, b) => a.order - b.order || a.id.localeCompare(b.id),
);

assertRegistryValid(ALL_MIGRATIONS);

const MAX_CONFLICT_RETRIES = 5;

function isRetriableStorageConflict(e: unknown): boolean {
  const code = (e as { code?: string }).code;
  return code === "VERSION_CONFLICT" || code === "REF_CONFLICT";
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function commitMigrationBatch(
  migrationId: string,
  changes: Parameters<typeof commitFiles>[0],
  dryRun: boolean,
): Promise<void> {
  if (changes.length === 0) return;
  if (dryRun) {
    for (const c of changes) {
      if ("delete" in c && c.delete) {
        console.info(`[migrations] dry-run delete ${c.path}`);
      } else {
        console.info(`[migrations] dry-run write ${c.path}`);
      }
    }
    return;
  }
  for (const change of changes) {
    if ("delete" in change && change.delete) continue;
    const write = change as Exclude<typeof change, { delete: true }>;
    validateMigrationFileChange(change.path, write.content);
  }
  await commitFiles(changes, `chore(data): migration ${migrationId}`);
}

export async function runDataMigrations(options: {
  trigger: MigrationTrigger;
  dryRun?: boolean;
}): Promise<MigrationRunSummary> {
  const dryRun = options.dryRun ?? false;
  const summary: MigrationRunSummary = {
    applied: [],
    skipped: [],
    dryRun,
  };

  await withPathLock("__data_migrations__", async () => {
    for (const migration of ALL_MIGRATIONS) {
      let attempt = 0;
      while (attempt < MAX_CONFLICT_RETRIES) {
        attempt += 1;
        const state = await loadMigrationState();
        if (isMigrationApplied(state, migration.id)) {
          summary.skipped.push(migration.id);
          break;
        }

        console.info(
          `[migrations] running ${migration.id} (order ${migration.order})`,
        );

        try {
          const ctx: MigrationContext = {
            trigger: options.trigger,
            dryRun,
            readJson,
            listJsonDir,
          };
          const result = await migration.run(ctx);

          const entityChanges = result.changes;
          if (entityChanges.length > 0) {
            await commitMigrationBatch(
              migration.id,
              entityChanges,
              dryRun,
            );
          }

          if (!dryRun) {
            const nextState = markMigrationApplied(state, migration.id);
            await commitMigrationBatch(migration.id, [stateFileChange(nextState)], false);
          }

          summary.applied.push(migration.id);
          console.info(
            `[migrations] done ${migration.id}`,
            JSON.stringify(result.stats),
          );
          break;
        } catch (e) {
          if (isRetriableStorageConflict(e) && attempt < MAX_CONFLICT_RETRIES) {
            const backoff = 200 * attempt;
            const code = (e as { code?: string }).code ?? "CONFLICT";
            console.warn(
              `[migrations] ${code} on ${migration.id}, retry ${attempt}/${MAX_CONFLICT_RETRIES} in ${backoff}ms`,
            );
            await sleep(backoff);
            continue;
          }
          throw e;
        }
      }
    }
  });

  return summary;
}
