import { z } from "zod";
import { readJson } from "@/src/lib/data";
import {
  LEGACY_PRODUCTION_MIGRATION_IDS,
  PRODUCTION_BASELINE_MIGRATION_ID,
} from "@/src/lib/data/migrations/legacy-ids";
import { serializeDataJson } from "@/src/lib/data/migrations/json-equal";
import type { FileChange } from "@/src/lib/data/types";

export const MIGRATIONS_STATE_PATH = "configuracoes/migrations.json";

const migrationAppliedEntrySchema = z.object({
  appliedAt: z.string().min(1),
});

export const migrationsStateSchema = z.object({
  schemaVersion: z.literal(1),
  applied: z.record(migrationAppliedEntrySchema),
});

export type MigrationsState = z.infer<typeof migrationsStateSchema>;

export const EMPTY_MIGRATIONS_STATE: MigrationsState = {
  schemaVersion: 1,
  applied: {},
};

export async function loadMigrationState(): Promise<MigrationsState> {
  const raw = await readJson<unknown>(MIGRATIONS_STATE_PATH);
  if (!raw) return { ...EMPTY_MIGRATIONS_STATE };
  const parsed = migrationsStateSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      "[migrations] invalid state file, resetting ledger in memory",
      parsed.error.flatten(),
    );
    return { ...EMPTY_MIGRATIONS_STATE };
  }
  return parsed.data;
}

export function isMigrationApplied(
  state: MigrationsState,
  migrationId: string,
): boolean {
  if (migrationId === PRODUCTION_BASELINE_MIGRATION_ID) {
    return migrationId in state.applied;
  }
  if (
    (LEGACY_PRODUCTION_MIGRATION_IDS as readonly string[]).includes(migrationId)
  ) {
    return true;
  }
  return migrationId in state.applied;
}

export function markMigrationApplied(
  state: MigrationsState,
  migrationId: string,
): MigrationsState {
  const applied = { ...state.applied };
  if (migrationId === PRODUCTION_BASELINE_MIGRATION_ID) {
    for (const legacyId of LEGACY_PRODUCTION_MIGRATION_IDS) {
      delete applied[legacyId];
    }
  }
  applied[migrationId] = { appliedAt: new Date().toISOString() };
  return {
    ...state,
    applied,
  };
}

export function stateFileChange(state: MigrationsState): FileChange {
  return {
    path: MIGRATIONS_STATE_PATH,
    content: serializeDataJson(state),
    encoding: "utf-8",
  };
}
