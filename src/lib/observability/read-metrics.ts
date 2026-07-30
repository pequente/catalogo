import { AsyncLocalStorage } from "async_hooks";

export type ReadOpKind = "readJson" | "listJsonDir" | "readBinary";

export type ReadOpRecord = {
  kind: ReadOpKind;
  path: string;
  bytes: number;
  durationMs: number;
  ok: boolean;
};

export type CacheProbeRecord = {
  key: string;
  outcome: "hit" | "miss";
  durationMs: number;
};

/** Fase 5 — listing-route context attached to a metrics collector. */
export type ListingReadContext = {
  page?: number;
  pageSize?: number;
  /** True when the product index was used (not O(N) entity scan). */
  indexHit?: boolean;
  /** Estimated document / serialized payload bytes. */
  estimatedHtmlBytes?: number;
  route?: string;
};

export type ReadMetricsSnapshot = {
  requestId: string;
  label?: string;
  backend: string;
  startedAt: string;
  durationMs: number;
  /** Successful `readJson` + `readBinary` calls (content files). */
  filesRead: number;
  listDirCalls: number;
  bytesRead: number;
  readJsonCount: number;
  readJsonMs: number;
  listJsonDirCount: number;
  listJsonDirMs: number;
  readBinaryCount: number;
  readBinaryMs: number;
  cache: CacheProbeRecord[];
  ops: ReadOpRecord[];
  listing?: ListingReadContext;
};

type PendingCacheProbe = {
  key: string;
  miss: boolean;
  t0: number;
  opsAtStart: number;
};

type Store = {
  requestId: string;
  label?: string;
  backend: string;
  startedAtIso: string;
  t0: number;
  ops: ReadOpRecord[];
  cache: CacheProbeRecord[];
  pendingCache: PendingCacheProbe[];
  listing?: ListingReadContext;
};

const als = new AsyncLocalStorage<Store>();

/** Fallback when ALS does not propagate across `unstable_cache` boundaries. */
const collectorStack: Store[] = [];

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return undefined;
  if (raw === "1" || raw === "true" || raw === "on" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "off" || raw === "no") return false;
  return undefined;
}

/** Controls read metrics, logs, alerts, and diagnostics. Defaults on in development. */
export function isReadMetricsEnabled(): boolean {
  const flag = envFlag("READ_METRICS");
  if (flag !== undefined) return flag;
  return process.env.NODE_ENV === "development";
}

function currentStore(): Store | undefined {
  return als.getStore() ?? collectorStack[collectorStack.length - 1];
}

function resolveBackend(explicit?: string): string {
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "development") return "fs";
  const raw = process.env.DATA_BACKEND?.trim().toLowerCase();
  if (raw === "github" || raw === "fs") return raw;
  return "fs";
}

function createStore(opts: {
  label?: string;
  backend?: string;
  requestId?: string;
  listing?: ListingReadContext;
}): Store {
  return {
    requestId: opts.requestId ?? crypto.randomUUID(),
    label: opts.label,
    backend: resolveBackend(opts.backend),
    startedAtIso: new Date().toISOString(),
    t0: performance.now(),
    ops: [],
    cache: [],
    pendingCache: [],
    listing: opts.listing ? { ...opts.listing } : undefined,
  };
}

function inferIndexHit(store: Store): boolean | undefined {
  if (store.listing?.indexHit !== undefined) return store.listing.indexHit;
  const cacheHit = store.cache.some(
    (c) => c.key.includes("product-index") && c.outcome === "hit",
  );
  if (cacheHit) return true;
  const readIndex = store.ops.some(
    (op) => op.ok && op.kind === "readJson" && op.path.startsWith("indices/"),
  );
  const readEntities = store.ops.some(
    (op) =>
      op.ok &&
      op.kind === "readJson" &&
      op.path.startsWith("produtos/") &&
      !op.path.startsWith("indices/"),
  );
  if (readIndex && !readEntities) return true;
  if (readEntities && !readIndex) return false;
  return store.listing?.indexHit;
}

function summarize(store: Store): ReadMetricsSnapshot {
  let filesRead = 0;
  let listDirCalls = 0;
  let bytesRead = 0;
  let readJsonCount = 0;
  let readJsonMs = 0;
  let listJsonDirCount = 0;
  let listJsonDirMs = 0;
  let readBinaryCount = 0;
  let readBinaryMs = 0;

  for (const op of store.ops) {
    bytesRead += op.bytes;
    if (op.kind === "listJsonDir") {
      listDirCalls += 1;
      listJsonDirCount += 1;
      listJsonDirMs += op.durationMs;
      continue;
    }
    if (op.ok) filesRead += 1;
    if (op.kind === "readJson") {
      readJsonCount += 1;
      readJsonMs += op.durationMs;
    } else {
      readBinaryCount += 1;
      readBinaryMs += op.durationMs;
    }
  }

  const indexHit = inferIndexHit(store);
  const listing =
    store.listing || indexHit !== undefined
      ? {
          ...store.listing,
          ...(indexHit !== undefined ? { indexHit } : {}),
        }
      : undefined;

  return {
    requestId: store.requestId,
    label: store.label,
    backend: store.backend,
    startedAt: store.startedAtIso,
    durationMs: roundMs(performance.now() - store.t0),
    filesRead,
    listDirCalls,
    bytesRead,
    readJsonCount,
    readJsonMs: roundMs(readJsonMs),
    listJsonDirCount,
    listJsonDirMs: roundMs(listJsonDirMs),
    readBinaryCount,
    readBinaryMs: roundMs(readBinaryMs),
    cache: store.cache.map((c) => ({
      ...c,
      durationMs: roundMs(c.durationMs),
    })),
    ops: store.ops.map((op) => ({
      ...op,
      durationMs: roundMs(op.durationMs),
    })),
    listing,
  };
}

export function roundMs(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Merge listing context into the active collector (page, pageSize, indexHit, …). */
export function setListingReadContext(ctx: ListingReadContext): void {
  const store = currentStore();
  if (!store) return;
  store.listing = { ...store.listing, ...ctx };
}

/**
 * Runs `fn` under a request-scoped metrics collector.
 * Safe to nest; inner runs get their own snapshot.
 */
export async function runWithReadMetrics<T>(
  opts: {
    label?: string;
    backend?: string;
    requestId?: string;
    listing?: ListingReadContext;
  },
  fn: () => Promise<T>,
): Promise<{ result: T; metrics: ReadMetricsSnapshot }> {
  const store = createStore(opts);
  collectorStack.push(store);
  try {
    const result = await als.run(store, fn);
    const metrics = summarize(store);
    if (isReadMetricsEnabled()) {
      logReadMetrics(metrics);
      const alerts = evaluateReadAlerts(metrics);
      logReadAlerts(alerts, {
        requestId: metrics.requestId,
        label: metrics.label,
      });
    }
    return { result, metrics };
  } finally {
    collectorStack.pop();
  }
}

/** Record a data-plane read. No-op when no collector is active. */
export function recordReadOp(input: {
  kind: ReadOpKind;
  path: string;
  bytes?: number;
  durationMs: number;
  ok: boolean;
}): void {
  const store = currentStore();
  if (!store) return;
  store.ops.push({
    kind: input.kind,
    path: input.path,
    bytes: Math.max(0, input.bytes ?? 0),
    durationMs: input.durationMs,
    ok: input.ok,
  });
}

export function beginCacheLookup(key: string): void {
  const store = currentStore();
  if (!store) return;
  store.pendingCache.push({
    key,
    miss: false,
    t0: performance.now(),
    opsAtStart: store.ops.length,
  });
}

/** Call from inside an `unstable_cache` factory — marks the active lookup as miss. */
export function markCacheMiss(key: string): void {
  const store = currentStore();
  if (!store) return;
  for (let i = store.pendingCache.length - 1; i >= 0; i -= 1) {
    const probe = store.pendingCache[i];
    if (probe.key === key) {
      probe.miss = true;
      return;
    }
  }
}

export function endCacheLookup(key: string): void {
  const store = currentStore();
  if (!store) return;
  for (let i = store.pendingCache.length - 1; i >= 0; i -= 1) {
    const probe = store.pendingCache[i];
    if (probe.key !== key) continue;
    store.pendingCache.splice(i, 1);
    const ioDuring = store.ops.length > probe.opsAtStart;
    store.cache.push({
      key: probe.key,
      outcome: probe.miss || ioDuring ? "miss" : "hit",
      durationMs: performance.now() - probe.t0,
    });
    return;
  }
}

export function getActiveReadMetrics(): ReadMetricsSnapshot | null {
  const store = currentStore();
  return store ? summarize(store) : null;
}

/** Alert thresholds (Fase 5). */
export const READ_ALERT_THRESHOLDS = {
  listingFilesRead: 20,
  listingHtmlBytes: 500 * 1024,
} as const;

export type ReadAlert = {
  code: "LISTING_FILES_READ" | "LISTING_HTML_BYTES";
  message: string;
  actual: number;
  threshold: number;
};

export function evaluateReadAlerts(metrics: ReadMetricsSnapshot): ReadAlert[] {
  const alerts: ReadAlert[] = [];
  const listing = metrics.listing;
  const looksLikeListing =
    listing?.page != null ||
    listing?.pageSize != null ||
    listing?.route != null ||
    (metrics.label?.toLowerCase().includes("listing") ?? false) ||
    (metrics.label?.toLowerCase().includes("products") ?? false);

  if (
    looksLikeListing &&
    metrics.filesRead > READ_ALERT_THRESHOLDS.listingFilesRead
  ) {
    alerts.push({
      code: "LISTING_FILES_READ",
      message: `Listing read ${metrics.filesRead} files (threshold ${READ_ALERT_THRESHOLDS.listingFilesRead})`,
      actual: metrics.filesRead,
      threshold: READ_ALERT_THRESHOLDS.listingFilesRead,
    });
  }

  const htmlBytes = listing?.estimatedHtmlBytes;
  if (
    htmlBytes != null &&
    htmlBytes > READ_ALERT_THRESHOLDS.listingHtmlBytes
  ) {
    alerts.push({
      code: "LISTING_HTML_BYTES",
      message: `Listing payload ~${formatBytes(htmlBytes)} exceeds ${formatBytes(READ_ALERT_THRESHOLDS.listingHtmlBytes)}`,
      actual: htmlBytes,
      threshold: READ_ALERT_THRESHOLDS.listingHtmlBytes,
    });
  }

  return alerts;
}

export function logReadAlerts(
  alerts: ReadAlert[],
  extra?: Record<string, unknown>,
): void {
  for (const alert of alerts) {
    console.warn(
      JSON.stringify({
        type: "read_alert",
        ...alert,
        ...extra,
      }),
    );
  }
}

export function logReadMetrics(
  metrics: ReadMetricsSnapshot,
  extra?: Record<string, unknown>,
): void {
  const cacheSummary = metrics.cache.length
    ? metrics.cache.map((c) => `${c.key}:${c.outcome}`).join(",")
    : "none";

  console.info(
    JSON.stringify({
      type: "read_metrics",
      requestId: metrics.requestId,
      label: metrics.label,
      backend: metrics.backend,
      durationMs: metrics.durationMs,
      filesRead: metrics.filesRead,
      bytesRead: metrics.bytesRead,
      bytesReadHuman: formatBytes(metrics.bytesRead),
      listDirCalls: metrics.listDirCalls,
      readJsonCount: metrics.readJsonCount,
      readJsonMs: metrics.readJsonMs,
      listJsonDirMs: metrics.listJsonDirMs,
      indexHit: metrics.listing?.indexHit,
      page: metrics.listing?.page,
      pageSize: metrics.listing?.pageSize,
      route: metrics.listing?.route,
      estimatedHtmlBytes: metrics.listing?.estimatedHtmlBytes,
      estimatedHtmlBytesHuman:
        metrics.listing?.estimatedHtmlBytes != null
          ? formatBytes(metrics.listing.estimatedHtmlBytes)
          : undefined,
      cache: cacheSummary,
      cacheDetail: metrics.cache,
      ...extra,
    }),
  );
}

/** Compact view for API responses (omit per-file ops by default). */
export function toPublicReadMetrics(
  metrics: ReadMetricsSnapshot,
  opts?: { includeOps?: boolean },
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    requestId: metrics.requestId,
    label: metrics.label,
    backend: metrics.backend,
    startedAt: metrics.startedAt,
    durationMs: metrics.durationMs,
    filesRead: metrics.filesRead,
    bytesRead: metrics.bytesRead,
    bytesReadHuman: formatBytes(metrics.bytesRead),
    listDirCalls: metrics.listDirCalls,
    readJsonCount: metrics.readJsonCount,
    readJsonMs: metrics.readJsonMs,
    listJsonDirCount: metrics.listJsonDirCount,
    listJsonDirMs: metrics.listJsonDirMs,
    readBinaryCount: metrics.readBinaryCount,
    readBinaryMs: metrics.readBinaryMs,
    cache: metrics.cache,
    listing: metrics.listing,
    alerts: evaluateReadAlerts(metrics),
  };
  if (opts?.includeOps) {
    base.ops = metrics.ops;
    base.opsSample = metrics.ops.slice(0, 20);
  }
  return base;
}

/** Rough HTML budget from a serialized page DTO (RSC ships more than JSON). */
export function estimateJsonPayloadBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}
