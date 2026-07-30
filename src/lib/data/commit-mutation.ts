import "server-only";
import { toPosixRelative } from "./paths";
import type { FileChange } from "./types";

export function jsonFileChange(relativePath: string, data: unknown): FileChange {
  return {
    path: toPosixRelative(relativePath),
    content: `${JSON.stringify(data, null, 2)}\n`,
    encoding: "utf-8",
  };
}

export function binaryFileChange(
  relativePath: string,
  bytes: Buffer,
): FileChange {
  return {
    path: toPosixRelative(relativePath),
    content: bytes,
    encoding: "base64",
  };
}

export function deleteFileChange(relativePath: string): FileChange {
  return { path: toPosixRelative(relativePath), delete: true };
}

export function buildMutationFiles(parts: {
  jsonWrites?: { path: string; data: unknown }[];
  binaryWrites?: { path: string; bytes: Buffer }[];
  deletes?: string[];
}): FileChange[] {
  const files: FileChange[] = [];
  for (const w of parts.binaryWrites ?? []) {
    files.push(binaryFileChange(w.path, w.bytes));
  }
  for (const w of parts.jsonWrites ?? []) {
    files.push(jsonFileChange(w.path, w.data));
  }
  for (const p of parts.deletes ?? []) {
    files.push(deleteFileChange(p));
  }
  return files;
}
