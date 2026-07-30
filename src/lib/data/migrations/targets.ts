import {
  jsonDocumentsEqual,
  serializeDataJson,
} from "@/src/lib/data/migrations/json-equal";
import type { FileChange } from "@/src/lib/data/types";

export { jsonDocumentsEqual, serializeDataJson };

export function fileChangeIfMigrated(
  relativePath: string,
  raw: unknown,
  migrated: unknown,
): FileChange | null {
  if (jsonDocumentsEqual(raw, migrated)) return null;
  return {
    path: relativePath,
    content: serializeDataJson(migrated),
    encoding: "utf-8",
  };
}
