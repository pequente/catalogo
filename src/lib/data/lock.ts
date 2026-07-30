import "server-only";

const locks = new Map<string, Promise<void>>();

export async function withPathLock<T>(
  key: string,
  fn: () => Promise<T>,
  timeoutMs = 10_000,
): Promise<T> {
  const started = Date.now();
  while (locks.has(key)) {
    if (Date.now() - started > timeoutMs) {
      const err = new Error("Storage busy");
      (err as Error & { code: string }).code = "STORAGE_BUSY";
      throw err;
    }
    await locks.get(key);
  }

  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(key, gate);

  try {
    return await fn();
  } finally {
    locks.delete(key);
    release();
  }
}

/**
 * Acquire multiple path locks in sorted order (deadlock-safe), then run `fn`.
 * Used by FS `commitFiles` so entity + index rewrites serialize together.
 */
export async function withPathLocks<T>(
  keys: string[],
  fn: () => Promise<T>,
  timeoutMs = 10_000,
): Promise<T> {
  const unique = [...new Set(keys.filter(Boolean))].sort();
  async function nest(i: number): Promise<T> {
    if (i >= unique.length) return fn();
    return withPathLock(unique[i]!, () => nest(i + 1), timeoutMs);
  }
  return nest(0);
}
