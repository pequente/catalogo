import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { recordReadOp } from "@/src/lib/observability/read-metrics";
import { assertDataPath, getDataRoot, toPosixRelative } from "./paths";
import { withPathLock, withPathLocks } from "./lock";
import {
  applyCommitFilesTransactional,
  commitLockKeys,
} from "./fs-commit";
import type { DataAdapter, FileChange } from "./types";

/** Caps concurrent FS opens to avoid EMFILE on large JSON directories (Windows). */
const FS_READ_CONCURRENCY = 64;

function createReadLimiter(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];

  return async function withReadLimit<T>(fn: () => Promise<T>): Promise<T> {
    while (active >= concurrency) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
    try {
      return await fn();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
}

const withReadLimit = createReadLimiter(FS_READ_CONCURRENCY);

async function ensureDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function atomicWrite(absolute: string, content: Buffer | string) {
  await ensureDir(absolute);
  const tmp = `${absolute}.tmp-${crypto.randomUUID()}`;
  await fs.writeFile(tmp, content);
  await fs.rename(tmp, absolute);
}

function serializeJson(data: unknown): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}

export const fsAdapter: DataAdapter = {
  async readJson<T>(relativePath: string): Promise<T | null> {
    const absolute = assertDataPath(relativePath);
    const t0 = performance.now();
    try {
      let raw = await withReadLimit(() => fs.readFile(absolute, "utf8"));
      if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
      recordReadOp({
        kind: "readJson",
        path: relativePath,
        bytes: Buffer.byteLength(raw, "utf8"),
        durationMs: performance.now() - t0,
        ok: true,
      });
      return JSON.parse(raw) as T;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        recordReadOp({
          kind: "readJson",
          path: relativePath,
          bytes: 0,
          durationMs: performance.now() - t0,
          ok: false,
        });
        return null;
      }
      recordReadOp({
        kind: "readJson",
        path: relativePath,
        bytes: 0,
        durationMs: performance.now() - t0,
        ok: false,
      });
      throw e;
    }
  },

  async listJsonDir(relativeDir: string): Promise<string[]> {
    const absolute = assertDataPath(relativeDir);
    const t0 = performance.now();
    try {
      const entries = await withReadLimit(() =>
        fs.readdir(absolute, { withFileTypes: true }),
      );
      const names = entries
        .filter((e) => e.isFile() && e.name.endsWith(".json"))
        .map((e) => e.name)
        .sort();
      recordReadOp({
        kind: "listJsonDir",
        path: relativeDir,
        bytes: names.reduce((sum, n) => sum + Buffer.byteLength(n, "utf8"), 0),
        durationMs: performance.now() - t0,
        ok: true,
      });
      return names;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        recordReadOp({
          kind: "listJsonDir",
          path: relativeDir,
          bytes: 0,
          durationMs: performance.now() - t0,
          ok: true,
        });
        return [];
      }
      recordReadOp({
        kind: "listJsonDir",
        path: relativeDir,
        bytes: 0,
        durationMs: performance.now() - t0,
        ok: false,
      });
      throw e;
    }
  },

  async writeJson(relativePath, data) {
    const key = toPosixRelative(relativePath);
    await withPathLock(key, async () => {
      const absolute = assertDataPath(relativePath);
      await atomicWrite(absolute, serializeJson(data));
    });
  },

  async deleteJson(relativePath) {
    const key = toPosixRelative(relativePath);
    await withPathLock(key, async () => {
      const absolute = assertDataPath(relativePath);
      try {
        await fs.unlink(absolute);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
      }
    });
  },

  async readBinary(relativePath) {
    const absolute = assertDataPath(relativePath);
    const t0 = performance.now();
    try {
      const bytes = await withReadLimit(() => fs.readFile(absolute));
      recordReadOp({
        kind: "readBinary",
        path: relativePath,
        bytes: bytes.byteLength,
        durationMs: performance.now() - t0,
        ok: true,
      });
      return bytes;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        recordReadOp({
          kind: "readBinary",
          path: relativePath,
          bytes: 0,
          durationMs: performance.now() - t0,
          ok: false,
        });
        return null;
      }
      recordReadOp({
        kind: "readBinary",
        path: relativePath,
        bytes: 0,
        durationMs: performance.now() - t0,
        ok: false,
      });
      throw e;
    }
  },

  async writeBinary(relativePath, bytes) {
    const key = toPosixRelative(relativePath);
    await withPathLock(key, async () => {
      const absolute = assertDataPath(relativePath);
      await atomicWrite(absolute, bytes);
    });
  },

  /**
   * Atomic multi-file batch (Fase 5): path locks + snapshot/rollback.
   * On mid-batch failure, restores prior bytes so a new index manifest never
   * lands without its matching entity JSON (or vice-versa).
   * GitHub adapter uses a single git commit for the same guarantee.
   */
  async commitFiles(files: FileChange[]) {
    if (files.length === 0) return;
    const keys = commitLockKeys(files);
    await withPathLocks(keys, async () => {
      await applyCommitFilesTransactional(files, (rel) => assertDataPath(rel));
    });
  },
};

export async function ensureDataDirs() {
  const dirs = [
    "produtos",
    "categorias",
    "banners",
    "clientes",
    "pedidos",
    "configuracoes",
    "analytics/daily",
    "imagens/produtos",
    "imagens/banners",
    "imagens/site",
    "indices",
  ];
  for (const d of dirs) {
    await fs.mkdir(path.join(getDataRoot(), d), { recursive: true });
  }
}
