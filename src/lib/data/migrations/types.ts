import type { FileChange } from "@/src/lib/data/types";
import {
  fileChangeIfMigrated,
  serializeDataJson,
} from "@/src/lib/data/migrations/targets";

export type MigrationTrigger = "startup" | "cli";

export type MigrationContext = {
  trigger: MigrationTrigger;
  dryRun: boolean;
  readJson: <T>(relativePath: string) => Promise<T | null>;
  listJsonDir: (relativeDir: string) => Promise<string[]>;
};

export type MigrationRunResult = {
  changes: FileChange[];
  stats: Record<string, unknown>;
  /** Migration committed entity/index files itself (e.g. indices repair). */
  selfCommitted?: boolean;
};

export type DataMigration = {
  id: string;
  order: number;
  description: string;
  run: (ctx: MigrationContext) => Promise<MigrationRunResult>;
};

export type MigrationRunSummary = {
  applied: string[];
  skipped: string[];
  dryRun: boolean;
};

export async function mapJsonDir(
  ctx: MigrationContext,
  relativeDir: string,
  fn: (relativePath: string, raw: unknown) => FileChange | null,
): Promise<FileChange[]> {
  const files = await ctx.listJsonDir(relativeDir);
  const out: FileChange[] = [];
  for (const file of files) {
    const relativePath = `${relativeDir}/${file}`;
    const raw = await ctx.readJson<unknown>(relativePath);
    if (raw === null) continue;
    const change = fn(relativePath, raw);
    if (change) out.push(change);
  }
  return out;
}

export { fileChangeIfMigrated, serializeDataJson };
