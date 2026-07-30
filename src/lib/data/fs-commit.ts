import { promises as fs } from "fs";
import path from "path";
import type { FileChange } from "./types";

export type FsCommitSnapshot = {
  absolute: string;
  relative: string;
  /** Prior file bytes, or null if the path did not exist before the batch. */
  previous: Buffer | null;
};

export type FsCommitApplyResult = {
  applied: FsCommitSnapshot[];
};

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function atomicWrite(absolute: string, content: Buffer | string) {
  await ensureDir(absolute);
  const tmp = `${absolute}.tmp-${crypto.randomUUID()}`;
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, absolute);
}

async function readOptional(absolute: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(absolute);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function unlinkOptional(absolute: string): Promise<void> {
  try {
    await fs.unlink(absolute);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

/**
 * Snapshot current on-disk state for every path in a commit batch.
 * Call before mutating so a mid-batch failure can roll back.
 */
export async function snapshotCommitTargets(
  files: FileChange[],
  resolveAbsolute: (relative: string) => string,
): Promise<FsCommitSnapshot[]> {
  const byRel = new Map<string, FsCommitSnapshot>();
  for (const file of files) {
    const relative = file.path.replace(/^data\//, "").replace(/\\/g, "/");
    if (byRel.has(relative)) continue;
    const absolute = resolveAbsolute(relative);
    byRel.set(relative, {
      absolute,
      relative,
      previous: await readOptional(absolute),
    });
  }
  return [...byRel.values()];
}

/** Apply one FileChange (write or delete). */
export async function applyFileChange(
  file: FileChange,
  resolveAbsolute: (relative: string) => string,
): Promise<void> {
  const relative = file.path.replace(/^data\//, "").replace(/\\/g, "/");
  const absolute = resolveAbsolute(relative);

  if ("delete" in file && file.delete === true) {
    await unlinkOptional(absolute);
    return;
  }

  const write = file as Exclude<FileChange, { delete: true }>;
  const content = write.content;
  if (typeof content === "string") {
    if (relative.endsWith(".json") || write.encoding === "utf-8") {
      await atomicWrite(
        absolute,
        content.endsWith("\n") ? content : `${content}\n`,
      );
    } else {
      await atomicWrite(absolute, Buffer.from(content, "base64"));
    }
    return;
  }
  await atomicWrite(absolute, content);
}

/**
 * Restore files to the pre-batch snapshot (reverse order).
 * Best-effort: logs and continues if an individual restore fails.
 */
export async function rollbackCommitSnapshots(
  snapshots: FsCommitSnapshot[],
): Promise<void> {
  for (let i = snapshots.length - 1; i >= 0; i -= 1) {
    const snap = snapshots[i]!;
    try {
      if (snap.previous === null) {
        await unlinkOptional(snap.absolute);
      } else {
        await atomicWrite(snap.absolute, snap.previous);
      }
    } catch (err) {
      console.error(
        JSON.stringify({
          type: "fs_commit_rollback_error",
          path: snap.relative,
          message: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}

/**
 * Apply a multi-file commit with snapshot + rollback on failure.
 * Guarantees: either all changes land, or disk is restored to the
 * pre-batch snapshot (so a new index manifest never stays without its entity).
 */
export async function applyCommitFilesTransactional(
  files: FileChange[],
  resolveAbsolute: (relative: string) => string,
): Promise<void> {
  if (files.length === 0) return;

  const snapshots = await snapshotCommitTargets(files, resolveAbsolute);
  const appliedRels = new Set<string>();

  try {
    for (const file of files) {
      const relative = file.path.replace(/^data\//, "").replace(/\\/g, "/");
      await applyFileChange(file, resolveAbsolute);
      appliedRels.add(relative);
    }
  } catch (err) {
    const toRestore = snapshots.filter((s) => appliedRels.has(s.relative));
    await rollbackCommitSnapshots(toRestore);
    const wrapped = err instanceof Error ? err : new Error(String(err));
    (wrapped as Error & { code?: string }).code ??= "FS_COMMIT_FAILED";
    throw wrapped;
  }
}

/** Relative keys used for path locks (sorted by caller via withPathLocks). */
export function commitLockKeys(files: FileChange[]): string[] {
  return files.map((f) =>
    f.path.replace(/^data\//, "").replace(/\\/g, "/"),
  );
}

/** Exported for unit tests — join relative under a root without traversal checks. */
export function resolveUnderRoot(root: string, relative: string): string {
  const normalized = relative.replace(/\\/g, "/").replace(/^\/+/, "");
  return path.join(root, ...normalized.split("/"));
}
