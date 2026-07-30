import "server-only";
import { getDataBackend } from "@/src/lib/env";
import { fsAdapter, ensureDataDirs } from "./fs-adapter";
import { githubAdapter } from "./github-adapter";
import type { DataAdapter, DeleteOpts, FileChange, WriteOpts } from "./types";

export {
  assertDataPath,
  getDataRoot,
  InvalidPathError,
  DATA_DIR_NAME,
  DATA_ROOT,
} from "./paths";
export type { FileChange, WriteOpts, DeleteOpts } from "./types";

function adapter(): DataAdapter {
  return getDataBackend() === "github" ? githubAdapter : fsAdapter;
}

export async function readJson<T>(relativePath: string): Promise<T | null> {
  return adapter().readJson<T>(relativePath);
}

export async function listJsonDir(relativeDir: string): Promise<string[]> {
  return adapter().listJsonDir(relativeDir);
}

export async function writeJson(
  relativePath: string,
  data: unknown,
  opts?: WriteOpts,
): Promise<void> {
  if (getDataBackend() === "fs") await ensureDataDirs();
  return adapter().writeJson(relativePath, data, opts);
}

export async function deleteJson(
  relativePath: string,
  opts?: DeleteOpts,
): Promise<void> {
  return adapter().deleteJson(relativePath, opts);
}

export async function readBinary(
  relativePath: string,
): Promise<Buffer | null> {
  return adapter().readBinary(relativePath);
}

export async function writeBinary(
  relativePath: string,
  bytes: Buffer,
  opts?: WriteOpts,
): Promise<void> {
  if (getDataBackend() === "fs") await ensureDataDirs();
  return adapter().writeBinary(relativePath, bytes, opts);
}

export async function commitFiles(
  files: FileChange[],
  message: string,
): Promise<void> {
  if (getDataBackend() === "fs") await ensureDataDirs();
  return adapter().commitFiles(files, message);
}

export async function getFileSha(
  relativePath: string,
): Promise<string | null> {
  const a = adapter();
  if (a.getFileSha) return a.getFileSha(relativePath);
  return null;
}
