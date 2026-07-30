import {
  evaluateReadAlerts,
  isReadMetricsEnabled,
  runWithReadMetrics,
  setListingReadContext,
  type ListingReadContext,
  type ReadAlert,
  type ReadMetricsSnapshot,
} from "@/src/lib/observability/read-metrics";

export {
  estimateJsonPayloadBytes,
  evaluateReadAlerts,
  READ_ALERT_THRESHOLDS,
  setListingReadContext,
  type ListingReadContext,
  type ReadAlert,
} from "@/src/lib/observability/read-metrics";

export type ListingReadResult<T> = {
  result: T;
  metrics: ReadMetricsSnapshot;
  listing: ListingReadContext;
  alerts: ReadAlert[];
};

/**
 * Run a listing loader under read metrics with page/pageSize/indexHit context.
 * No-ops collection when READ_METRICS is off (still runs `fn`).
 */
export async function runWithListingReadMetrics<T>(
  opts: {
    label: string;
    page?: number;
    pageSize?: number;
    route?: string;
    backend?: string;
    requestId?: string;
    /** Called after `fn` to estimate serialized HTML/DTO bytes. */
    estimateHtmlBytes?: (result: T) => number;
  },
  fn: () => Promise<T>,
): Promise<ListingReadResult<T>> {
  if (!isReadMetricsEnabled()) {
    const result = await fn();
    return {
      result,
      metrics: {
        requestId: opts.requestId ?? "metrics-disabled",
        label: opts.label,
        backend: opts.backend ?? "unknown",
        startedAt: new Date().toISOString(),
        durationMs: 0,
        filesRead: 0,
        listDirCalls: 0,
        bytesRead: 0,
        readJsonCount: 0,
        readJsonMs: 0,
        listJsonDirCount: 0,
        listJsonDirMs: 0,
        readBinaryCount: 0,
        readBinaryMs: 0,
        cache: [],
        ops: [],
      },
      listing: {
        page: opts.page,
        pageSize: opts.pageSize,
        route: opts.route,
      },
      alerts: [],
    };
  }

  const { result, metrics } = await runWithReadMetrics(
    {
      label: opts.label,
      backend: opts.backend,
      requestId: opts.requestId,
      listing: {
        page: opts.page,
        pageSize: opts.pageSize,
        route: opts.route,
      },
    },
    async () => {
      const value = await fn();
      if (opts.estimateHtmlBytes) {
        setListingReadContext({
          estimatedHtmlBytes: opts.estimateHtmlBytes(value),
        });
      }
      return value;
    },
  );

  return {
    result,
    metrics,
    listing: metrics.listing ?? {
      page: opts.page,
      pageSize: opts.pageSize,
      route: opts.route,
    },
    alerts: evaluateReadAlerts(metrics),
  };
}
