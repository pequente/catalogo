import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  beginCacheLookup,
  endCacheLookup,
  evaluateReadAlerts,
  formatBytes,
  markCacheMiss,
  READ_ALERT_THRESHOLDS,
  recordReadOp,
  runWithReadMetrics,
  setListingReadContext,
} from "./read-metrics";

describe("read-metrics", () => {
  it("aggregates filesRead, bytesRead and listDirCalls", async () => {
    const { metrics } = await runWithReadMetrics({ label: "test" }, async () => {
      recordReadOp({
        kind: "listJsonDir",
        path: "produtos",
        bytes: 10,
        durationMs: 5,
        ok: true,
      });
      recordReadOp({
        kind: "readJson",
        path: "produtos/a.json",
        bytes: 1000,
        durationMs: 12,
        ok: true,
      });
      recordReadOp({
        kind: "readJson",
        path: "produtos/missing.json",
        bytes: 0,
        durationMs: 1,
        ok: false,
      });
      recordReadOp({
        kind: "readBinary",
        path: "media/x.webp",
        bytes: 500,
        durationMs: 3,
        ok: true,
      });
      return true;
    });

    assert.equal(metrics.filesRead, 2);
    assert.equal(metrics.listDirCalls, 1);
    assert.equal(metrics.bytesRead, 1510);
    assert.equal(metrics.readJsonCount, 2);
    assert.equal(metrics.readBinaryCount, 1);
    assert.equal(metrics.label, "test");
  });

  it("detects cache miss via markCacheMiss and hit when factory skipped", async () => {
    const miss = await runWithReadMetrics({ label: "miss" }, async () => {
      beginCacheLookup("storefront-all-products");
      markCacheMiss("storefront-all-products");
      recordReadOp({
        kind: "readJson",
        path: "produtos/a.json",
        bytes: 10,
        durationMs: 1,
        ok: true,
      });
      endCacheLookup("storefront-all-products");
      return true;
    });
    assert.equal(miss.metrics.cache[0]?.outcome, "miss");

    const hit = await runWithReadMetrics({ label: "hit" }, async () => {
      beginCacheLookup("storefront-all-products");
      endCacheLookup("storefront-all-products");
      return true;
    });
    assert.equal(hit.metrics.cache[0]?.outcome, "hit");
  });

  it("formats bytes for humans", () => {
    assert.equal(formatBytes(512), "512 B");
    assert.equal(formatBytes(2048), "2.0 KB");
    assert.equal(formatBytes(2.5 * 1024 * 1024), "2.50 MB");
  });

  it("logs listing context and alerts on filesRead / html thresholds", async () => {
    const prevMetrics = process.env.READ_METRICS;
    process.env.READ_METRICS = "0";
    try {
      const { metrics } = await runWithReadMetrics(
        {
          label: "admin.produtos.listing",
          listing: { page: 1, pageSize: 20, route: "/admin/produtos" },
        },
        async () => {
          for (let i = 0; i < 25; i += 1) {
            recordReadOp({
              kind: "readJson",
              path: `produtos/${i}.json`,
              bytes: 100,
              durationMs: 1,
              ok: true,
            });
          }
          setListingReadContext({
            estimatedHtmlBytes: READ_ALERT_THRESHOLDS.listingHtmlBytes + 1,
            indexHit: false,
          });
          return true;
        },
      );

      assert.equal(metrics.listing?.page, 1);
      assert.equal(metrics.listing?.pageSize, 20);
      assert.equal(metrics.listing?.indexHit, false);
      assert.equal(metrics.filesRead, 25);

      const alerts = evaluateReadAlerts(metrics);
      assert.ok(alerts.some((a) => a.code === "LISTING_FILES_READ"));
      assert.ok(alerts.some((a) => a.code === "LISTING_HTML_BYTES"));
    } finally {
      if (prevMetrics === undefined) delete process.env.READ_METRICS;
      else process.env.READ_METRICS = prevMetrics;
    }
  });

  it("infers indexHit from indices/* reads without entity scans", async () => {
    const prevMetrics = process.env.READ_METRICS;
    process.env.READ_METRICS = "0";
    try {
      const { metrics } = await runWithReadMetrics(
        { label: "listing", listing: { page: 1, pageSize: 20 } },
        async () => {
          recordReadOp({
            kind: "readJson",
            path: "indices/produtos.json",
            bytes: 500,
            durationMs: 2,
            ok: true,
          });
          return true;
        },
      );
      assert.equal(metrics.listing?.indexHit, true);
    } finally {
      if (prevMetrics === undefined) delete process.env.READ_METRICS;
      else process.env.READ_METRICS = prevMetrics;
    }
  });
});
