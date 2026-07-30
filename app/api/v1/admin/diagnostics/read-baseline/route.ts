import "server-only";
import { revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { getDataBackend } from "@/src/lib/env";
import {
  formatBytes,
  isReadMetricsEnabled,
  runWithReadMetrics,
  toPublicReadMetrics,
  type ReadMetricsSnapshot,
} from "@/src/lib/observability/read-metrics";
import {
  getCachedAllProducts,
  getCachedProductIndex,
  listCachedProductListItems,
} from "@/src/lib/cache/storefront-reads";
import { listAllProducts } from "@/src/services/products.service";
import { listJsonDir } from "@/src/lib/data";
import {
  validateProductIndexConsistency,
} from "@/src/lib/indices/product-index-io";
import {
  estimateJsonPayloadBytes,
  runWithListingReadMetrics,
} from "@/src/lib/observability/listing-read";
import { PAGINATION } from "@/src/lib/pagination";

export const dynamic = "force-dynamic";

type Phase = "io" | "cache" | "listing" | "all";

function parsePhase(raw: string | null): Phase {
  if (raw === "io" || raw === "cache" || raw === "listing" || raw === "all") {
    return raw;
  }
  return "all";
}

function cacheOutcome(
  metrics: ReadMetricsSnapshot,
  key = "storefront-all-products",
): "hit" | "miss" | "unknown" {
  const probe = metrics.cache.find((c) => c.key === key);
  return probe?.outcome ?? "unknown";
}

async function measureListJsonDirOnly() {
  return runWithReadMetrics(
    { label: "listJsonDir:produtos", backend: getDataBackend() },
    async () => {
      const files = await listJsonDir("produtos");
      return { fileCount: files.length };
    },
  );
}

/**
 * Direct service path (includes Zod parse). Use only in `phase=io` requests so
 * React `cache()` does not poison a subsequent Data Cache cold probe in the
 * same request.
 */
async function measureListAllProductsDirect() {
  return runWithReadMetrics(
    { label: "listAllProducts", backend: getDataBackend() },
    async () => {
      const products = await listAllProducts();
      return { productCount: products.length };
    },
  );
}

async function measureCachedAllProducts(label: string) {
  return runWithReadMetrics(
    { label, backend: getDataBackend() },
    async () => {
      const products = await getCachedAllProducts();
      return { productCount: products.length };
    },
  );
}

async function measureCachedProductIndex(label: string) {
  return runWithReadMetrics(
    { label, backend: getDataBackend() },
    async () => {
      const index = await getCachedProductIndex();
      return {
        entryCount: index.entries.length,
        updatedAt: index.updatedAt,
      };
    },
  );
}

async function measurePublicApiPage() {
  return runWithReadMetrics(
    { label: "listCachedProductListItems:page1", backend: getDataBackend() },
    async () => {
      const page = await listCachedProductListItems({
        publicOnly: true,
        page: 1,
        pageSize: 24,
      });
      const payload = JSON.stringify(page);
      return {
        productCount: page.total,
        page: page.page,
        pageSize: page.pageSize,
        itemsReturned: page.items.length,
        payloadBytes: Buffer.byteLength(payload, "utf8"),
        payloadBytesHuman: formatBytes(Buffer.byteLength(payload, "utf8")),
      };
    },
  );
}

/** Fase 6: admin listing I/O (index page — must be ≪ N filesRead). */
async function measureAdminListingPage() {
  const pageSize = PAGINATION.ADMIN_DEFAULT_PAGE_SIZE;
  return runWithListingReadMetrics(
    {
      label: "admin.produtos.listing.diag",
      page: 1,
      pageSize,
      route: "/admin/produtos",
      backend: getDataBackend(),
      estimateHtmlBytes: (page) => estimateJsonPayloadBytes(page),
    },
    async () =>
      listCachedProductListItems({
        page: 1,
        pageSize,
      }),
  );
}

/** Fase 6: public catalog listing I/O (index page). */
async function measureCatalogListingPage() {
  const pageSize = PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE;
  return runWithListingReadMetrics(
    {
      label: "public.catalogo.listing.diag",
      page: 1,
      pageSize,
      route: "/catalogo",
      backend: getDataBackend(),
      estimateHtmlBytes: (page) => estimateJsonPayloadBytes(page),
    },
    async () =>
      listCachedProductListItems({
        publicOnly: true,
        page: 1,
        pageSize,
      }),
  );
}

/**
 * Phase 0 diagnostics: I/O + Data Cache hit/miss for product listing.
 * Requires admin session. Use `?flushCache=1` before cold measurements.
 *
 * Important: `phase=all` measures Data Cache first (cold/warm), then derives
 * I/O stats from the cold miss — avoiding React `cache()` poisoning.
 * Use `phase=io` alone for a dedicated direct `listAllProducts` timing.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    if (!isReadMetricsEnabled()) {
      throw new AppError(
        "FORBIDDEN",
        "Diagnostics desabilitado (READ_METRICS=0)",
        403,
      );
    }

    const sp = req.nextUrl.searchParams;
    const phase = parsePhase(sp.get("phase"));
    const flushCache =
      sp.get("flushCache") === "1" || sp.get("flushCache") === "true";
    const includeOps =
      sp.get("includeOps") === "1" || sp.get("includeOps") === "true";

    if (flushCache) {
      revalidateTag(CACHE_TAGS.products);
    }

    const measuredAt = new Date().toISOString();
    const backend = getDataBackend();
    const nodeEnv = process.env.NODE_ENV ?? "unknown";

    const response: Record<string, unknown> = {
      measuredAt,
      backend,
      nodeEnv,
      dataDir: nodeEnv === "development" ? "data-dev" : "data",
      phase,
      flushCache,
      goals: {
        adminWarmTtfbMs: 1000,
        adminDocumentBytes: 200 * 1024,
        adminColdAfterIndexMs: 3000,
        catalogIsrMissMs: 2000,
        apiProductsPageBytes: 50 * 1024,
      },
    };

    if (phase === "cache" || phase === "all") {
      const coldIndex = await measureCachedProductIndex(
        "getCachedProductIndex:cold",
      );
      const warmIndex = await measureCachedProductIndex(
        "getCachedProductIndex:warm",
      );
      const apiPage = await measurePublicApiPage();
      const consistency = await validateProductIndexConsistency();

      response.cache = {
        revalidateSeconds: 120,
        tag: CACHE_TAGS.products,
        productIndex: {
          cold: {
            ...coldIndex.result,
            cacheOutcome: cacheOutcome(
              coldIndex.metrics,
              "storefront-product-index",
            ),
            metrics: toPublicReadMetrics(coldIndex.metrics, { includeOps }),
          },
          warm: {
            ...warmIndex.result,
            cacheOutcome: cacheOutcome(
              warmIndex.metrics,
              "storefront-product-index",
            ),
            metrics: toPublicReadMetrics(warmIndex.metrics, { includeOps }),
          },
          consistency,
          consistencyOk: consistency.ok,
          consistencyIssueCount: consistency.deep?.issues.length ?? null,
          note: "Fase 2+5: listagens devem ler o índice (filesRead ≪ N); consistency é deep audit.",
        },
        publicApiPageEstimate: {
          ...apiPage.result,
          cacheOutcome: cacheOutcome(
            apiPage.metrics,
            "storefront-product-index",
          ),
          metrics: toPublicReadMetrics(apiPage.metrics, { includeOps }),
          note: "Serialized page payload size (in-memory). HTTP body size measured by baseline script.",
        },
        analysis: {
          indexWarmFilesRead: warmIndex.metrics.filesRead,
          indexColdFilesRead: coldIndex.metrics.filesRead,
          indexLooksHealthy:
            coldIndex.metrics.filesRead > 0 &&
            coldIndex.metrics.filesRead <= 10 &&
            consistency.ok,
          note:
            "After Fase 2, cold index should be O(1)–O(shards) filesRead, not ≈productCount.",
        },
      };

      // Legacy full-list probe kept for regression comparison (phase=all only).
      if (phase === "all") {
        const cold = await measureCachedAllProducts("getCachedAllProducts:cold");
        const dir = await measureListJsonDirOnly();
        response.io = {
          listJsonDir: {
            ...dir.result,
            metrics: toPublicReadMetrics(dir.metrics, { includeOps }),
          },
          listAllProducts: {
            productCount: cold.result.productCount,
            metrics: toPublicReadMetrics(cold.metrics, { includeOps }),
            note: "Legacy O(N) path — prefer productIndex metrics above.",
            cacheOutcome: cacheOutcome(cold.metrics),
          },
        };
        (response.cache as Record<string, unknown>).legacyAllProducts = {
          cold: {
            ...cold.result,
            cacheOutcome: cacheOutcome(cold.metrics),
            metrics: toPublicReadMetrics(cold.metrics, { includeOps }),
          },
        };
      }
    }

    if (phase === "io") {
      const dir = await measureListJsonDirOnly();
      const list = await measureListAllProductsDirect();
      response.io = {
        listJsonDir: {
          ...dir.result,
          metrics: toPublicReadMetrics(dir.metrics, { includeOps }),
        },
        listAllProducts: {
          ...list.result,
          metrics: toPublicReadMetrics(list.metrics, { includeOps }),
          note: "Direct listAllProducts() including Zod parse — O(N) readJson after one listJsonDir",
        },
      };
    }

    if (phase === "listing" || phase === "all") {
      const adminListing = await measureAdminListingPage();
      const catalogListing = await measureCatalogListingPage();
      const maxListingFiles = 20;
      response.listing = {
        adminProdutos: {
          total: adminListing.result.total,
          page: adminListing.result.page,
          pageSize: adminListing.result.pageSize,
          itemsReturned: adminListing.result.items.length,
          indexHit: adminListing.listing.indexHit ?? null,
          estimatedPayloadBytes: adminListing.listing.estimatedHtmlBytes ?? null,
          estimatedPayloadBytesHuman: adminListing.listing.estimatedHtmlBytes
            ? formatBytes(adminListing.listing.estimatedHtmlBytes)
            : null,
          metrics: toPublicReadMetrics(adminListing.metrics, { includeOps }),
          alerts: adminListing.alerts,
          filesReadOk: adminListing.metrics.filesRead <= maxListingFiles,
        },
        catalogo: {
          total: catalogListing.result.total,
          page: catalogListing.result.page,
          pageSize: catalogListing.result.pageSize,
          itemsReturned: catalogListing.result.items.length,
          indexHit: catalogListing.listing.indexHit ?? null,
          estimatedPayloadBytes:
            catalogListing.listing.estimatedHtmlBytes ?? null,
          estimatedPayloadBytesHuman: catalogListing.listing.estimatedHtmlBytes
            ? formatBytes(catalogListing.listing.estimatedHtmlBytes)
            : null,
          metrics: toPublicReadMetrics(catalogListing.metrics, { includeOps }),
          alerts: catalogListing.alerts,
          filesReadOk: catalogListing.metrics.filesRead <= maxListingFiles,
        },
        thresholds: {
          maxFilesRead: maxListingFiles,
          maxEstimatedHtmlBytes: 500 * 1024,
          adminDocumentBytesGoal: 200 * 1024,
        },
        note: "Fase 6: listagens pós-índice devem ter filesRead ≤ 20 e indexHit true.",
      };
    }

    return jsonOk(response);
  } catch (e) {
    return jsonError(e);
  }
}
