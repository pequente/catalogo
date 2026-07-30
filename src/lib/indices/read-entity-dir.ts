import "server-only";
import type { ZodType } from "zod";
import { listJsonDir, readJson } from "@/src/lib/data";

export type EntityDirReadError = {
  file: string;
  path: string;
  message: string;
};

export type EntityDirReadResult<T> = {
  entities: T[];
  fileCount: number;
  skipped: number;
  errors: EntityDirReadError[];
};

/**
 * Scan one entity directory with a model-specific Zod schema.
 * Type is discriminated by `dir` (caller passes the matching schema) —
 * never infer schema from JSON shape. Failures are isolated per file.
 */
export async function readEntityDir<T>(
  dir: string,
  schema: ZodType<T>,
  logPrefix: string,
): Promise<EntityDirReadResult<T>> {
  const files = await listJsonDir(dir);
  const entities: T[] = [];
  const errors: EntityDirReadError[] = [];
  let skipped = 0;

  const parsed = await Promise.all(
    files.map(async (file) => {
      const rel = `${dir}/${file}`;
      try {
        const raw = await readJson<unknown>(rel);
        if (raw == null) {
          return {
            ok: false as const,
            file,
            path: rel,
            message: "missing or empty",
          };
        }
        const result = schema.safeParse(raw);
        if (!result.success) {
          return {
            ok: false as const,
            file,
            path: rel,
            message: result.error.issues[0]?.message ?? "invalid",
          };
        }
        return { ok: true as const, data: result.data };
      } catch (e) {
        return {
          ok: false as const,
          file,
          path: rel,
          message: e instanceof Error ? e.message : String(e),
        };
      }
    }),
  );

  for (const row of parsed) {
    if (row.ok) {
      entities.push(row.data);
      continue;
    }
    skipped += 1;
    errors.push({ file: row.file, path: row.path, message: row.message });
    console.warn(`[${logPrefix}] skip invalid ${row.path}: ${row.message}`);
  }

  return { entities, fileCount: files.length, skipped, errors };
}
