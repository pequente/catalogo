import "server-only";
import { unstable_cache } from "next/cache";
import {
  filterEffectivelyActive,
  getFilterCategoryIds,
} from "@/src/lib/categories-tree";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/src/lib/cache/storefront-isr";
import {
  beginCacheLookup,
  endCacheLookup,
  markCacheMiss,
  setListingReadContext,
} from "@/src/lib/observability/read-metrics";
import {
  normalizePagination,
  paginateItems,
  PAGINATION,
  type PaginatedResult,
} from "@/src/lib/pagination";
import {
  indexEntryToListItem,
  filterProductIndexEntries,
} from "@/src/lib/indices/product-index-core";
import {
  buildProductIndexWritesFromDisk,
  readProductIndexState,
  resolveProductIdBySlug,
} from "@/src/lib/indices/product-index-io";
import type { ProductListItem } from "@/src/schemas/product-list";
import type { ProductIndexEntry } from "@/src/schemas/product-index";
import type { ProductIndexState } from "@/src/schemas/product-index";
import {
  buildCompactCatalogFacets,
  type CompactCatalogFacets,
} from "@/src/lib/front/catalog-facets";
import { listBanners } from "@/src/services/banners.service";
import { listCategories } from "@/src/services/categories.service";
import {
  getProductById,
  getProductBySlug,
  listAllProducts,
  type ListProductsFilters,
} from "@/src/services/products.service";
import { getSiteConfig, getSiteBranding } from "@/src/services/site-config.service";
import type { Banner } from "@/src/schemas/banner";
import type { Product } from "@/src/schemas/product";
import {
  buildOrderIndexWritesFromDisk,
  readOrderIndexState,
} from "@/src/lib/indices/order-index-io";
import {
  buildClientIndexWritesFromDisk,
  readClientIndexState,
} from "@/src/lib/indices/client-index-io";
import type { OrderIndexState } from "@/src/schemas/order-index";
import type { ClientIndexState } from "@/src/schemas/client-index";
import { indexEntryToOrder } from "@/src/schemas/order-index";
import { indexEntryToClient } from "@/src/schemas/client-index";
import type { Order } from "@/src/schemas/order";
import type { Client } from "@/src/schemas/client";
import {
  filterOrderIndexEntries,
} from "@/src/lib/indices/order-index-core";
import {
  filterClientIndexEntries,
} from "@/src/lib/indices/client-index-core";

/** Align Data Cache TTL with storefront ISR window. */
const REVALIDATE_SECONDS = STOREFRONT_REVALIDATE_SECONDS;

const CACHE_KEY_ALL_PRODUCTS = "storefront-all-products";
const CACHE_KEY_PRODUCT_INDEX = "storefront-product-index";

async function loadProductIndexStateUncached(): Promise<ProductIndexState> {
  const existing = await readProductIndexState();
  if (existing) {
    setListingReadContext({ indexHit: true });
    return existing;
  }
  console.warn(
    "[product-index] missing — building in-memory from produtos/* (run npm run indices:rebuild to persist)",
  );
  setListingReadContext({ indexHit: false });
  const { state } = await buildProductIndexWritesFromDisk();
  return state;
}

export const getCachedSiteConfig = unstable_cache(
  async () => getSiteConfig(),
  ["storefront-site-config"],
  { tags: [CACHE_TAGS.siteConfig], revalidate: REVALIDATE_SECONDS },
);

export const getCachedSiteBranding = unstable_cache(
  async () => getSiteBranding(),
  ["storefront-site-branding"],
  { tags: [CACHE_TAGS.siteConfig], revalidate: REVALIDATE_SECONDS },
);

export const getCachedAllCategories = unstable_cache(
  async () => listCategories(),
  ["storefront-all-categories"],
  { tags: [CACHE_TAGS.categories], revalidate: REVALIDATE_SECONDS },
);

export async function getCachedActiveCategories() {
  const all = await getCachedAllCategories();
  return filterEffectivelyActive(all);
}

export const getCachedAllBanners = unstable_cache(
  async () => listBanners(),
  ["storefront-all-banners"],
  { tags: [CACHE_TAGS.banners], revalidate: REVALIDATE_SECONDS },
);

export async function getCachedActiveBanners(posicao?: Banner["posicao"]) {
  let items = await getCachedAllBanners();
  items = items.filter((b) => b.ativo);
  if (posicao) items = items.filter((b) => b.posicao === posicao);
  return items;
}

const getCachedProductIndexInner = unstable_cache(
  async () => {
    markCacheMiss(CACHE_KEY_PRODUCT_INDEX);
    return loadProductIndexStateUncached();
  },
  [CACHE_KEY_PRODUCT_INDEX],
  { tags: [CACHE_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

/** Cached product index manifesto (tag `products`, 120s). */
export async function getCachedProductIndex() {
  beginCacheLookup(CACHE_KEY_PRODUCT_INDEX);
  try {
    return await getCachedProductIndexInner();
  } finally {
    endCacheLookup(CACHE_KEY_PRODUCT_INDEX);
  }
}

const getCachedAllProductsInner = unstable_cache(
  async () => {
    markCacheMiss(CACHE_KEY_ALL_PRODUCTS);
    return listAllProducts();
  },
  [CACHE_KEY_ALL_PRODUCTS],
  { tags: [CACHE_TAGS.products], revalidate: REVALIDATE_SECONDS },
);

/**
 * Full entity catalog — diagnostics / legacy only.
 * @deprecated Prefer getCachedProductIndex / listCachedProductListItems.
 */
export async function getCachedAllProducts() {
  beginCacheLookup(CACHE_KEY_ALL_PRODUCTS);
  try {
    return await getCachedAllProductsInner();
  } finally {
    endCacheLookup(CACHE_KEY_ALL_PRODUCTS);
  }
}

/**
 * @deprecated Prefer listCachedProductListItems.
 */
export async function getCachedPublicProductList() {
  const index = await getCachedProductIndex();
  const items = filterProductIndexEntries(index.entries, { publicOnly: true });
  return {
    items: items.map((e) => indexEntryToListItem(e)),
    total: items.length,
    page: 1,
    pageSize: items.length || 1,
  };
}

export async function getCachedProductBySlug(
  slug: string,
): Promise<Product | null> {
  const key = slug.trim().toLowerCase();
  if (!key) return null;
  return unstable_cache(
    async () => getProductBySlug(slug),
    [`storefront-product-by-slug`, key],
    { tags: [CACHE_TAGS.products], revalidate: REVALIDATE_SECONDS },
  )();
}

/** Slug → id map for sitemap / generateStaticParams (index only). */
export async function getCachedPublicProductSlugs(): Promise<
  Array<{ slug: string; atualizadoEm: string }>
> {
  const index = await getCachedProductIndex();
  return index.entries
    .filter((p) => p.status !== "oculto")
    .map((p) => ({ slug: p.slug, atualizadoEm: p.atualizadoEm }));
}

export async function getCachedClients(): Promise<Client[]> {
  const state = await getCachedClientIndex();
  return state.entries.map(indexEntryToClient);
}

async function loadOrderIndexStateUncached(): Promise<OrderIndexState> {
  const existing = await readOrderIndexState();
  if (existing) {
    setListingReadContext({ indexHit: true });
    return existing;
  }
  console.warn(
    "[order-index] missing — building in-memory from pedidos/* (run npm run indices:rebuild to persist)",
  );
  setListingReadContext({ indexHit: false });
  const { state } = await buildOrderIndexWritesFromDisk();
  return state;
}

async function loadClientIndexStateUncached(): Promise<ClientIndexState> {
  const existing = await readClientIndexState();
  if (existing) {
    setListingReadContext({ indexHit: true });
    return existing;
  }
  console.warn(
    "[client-index] missing — building in-memory from clientes/* (run npm run indices:rebuild to persist)",
  );
  setListingReadContext({ indexHit: false });
  const { state } = await buildClientIndexWritesFromDisk();
  return state;
}

/**
 * Order index for admin — bypasses Next Data Cache (2MB limit on large indices).
 * Still O(shards) I/O via persisted index files.
 */
export async function getCachedOrderIndex(): Promise<OrderIndexState> {
  return loadOrderIndexStateUncached();
}

/**
 * Client index for admin — bypasses Next Data Cache (2MB limit on large indices).
 * Still O(shards) I/O via persisted index files.
 */
export async function getCachedClientIndex(): Promise<ClientIndexState> {
  beginCacheLookup("admin-client-index");
  try {
    return await loadClientIndexStateUncached();
  } finally {
    endCacheLookup("admin-client-index");
  }
}

/** @deprecated Prefer getCachedOrderIndex / listOrdersPage — kept for callers needing Order[]. */
export async function getCachedOrders(): Promise<Order[]> {
  const state = await getCachedOrderIndex();
  return state.entries.map(indexEntryToOrder);
}

export async function listCachedOrderListItems(filters?: {
  status?: Order["status"];
  canal?: Order["canal"];
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Order>> {
  const index = await getCachedOrderIndex();
  setListingReadContext({ indexHit: true });
  const filtered = filterOrderIndexEntries(index.entries, filters);
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );
  const page = paginateItems(filtered, pagination);
  return {
    ...page,
    items: page.items.map(indexEntryToOrder),
  };
}

export async function listCachedClientListItems(filters?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Client>> {
  const index = await getCachedClientIndex();
  setListingReadContext({ indexHit: true });
  const filtered = filterClientIndexEntries(index.entries, filters);
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );
  const page = paginateItems(filtered, pagination);
  return {
    ...page,
    items: page.items.map(indexEntryToClient),
  };
}
function defaultPageSize(filters?: ListProductsFilters): number {
  return filters?.publicOnly
    ? PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE
    : PAGINATION.ADMIN_DEFAULT_PAGE_SIZE;
}

/**
 * Paginated public products as full entities.
 * Uses index for the page ids, then O(K) getProductById.
 */
export async function listCachedPublicProducts(
  filters?: Omit<ListProductsFilters, "publicOnly" | "status">,
): Promise<PaginatedResult<Product>> {
  const index = await getCachedProductIndex();
  const filtered = filterProductIndexEntries(index.entries, {
    ...filters,
    publicOnly: true,
  });
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE },
  );
  const page = paginateItems(filtered, pagination);
  const products = await Promise.all(
    page.items.map((e) => getProductById(e.id)),
  );
  return {
    ...page,
    items: products.filter((p): p is Product => p !== null),
  };
}

/** Paginated lean product DTOs — reads index only (no N entity files). */
export async function listCachedProductListItems(
  filters?: ListProductsFilters,
): Promise<PaginatedResult<ProductListItem>> {
  const index = await getCachedProductIndex();
  // Listing path is always index-backed (even when Data Cache serves the manifesto).
  setListingReadContext({ indexHit: true });
  const filtered = filterProductIndexEntries(index.entries, filters);
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: defaultPageSize(filters) },
  );
  const page = paginateItems(filtered, pagination);
  return {
    ...page,
    items: page.items.map((e) => indexEntryToListItem(e)),
  };
}

/**
 * Facet source for /catalogo — lean tamanhos/cores/categoriasIds from the
 * product index only (no entity file scan).
 * @deprecated Prefer getCachedPublicCatalogFacets (compact rows for RSC).
 */
export async function listCachedPublicFacetItems(filters?: {
  q?: string;
}): Promise<ProductListItem[]> {
  const index = await getCachedProductIndex();
  const filtered = filterProductIndexEntries(index.entries, {
    publicOnly: true,
    q: filters?.q,
  });
  return filtered.map((e) => indexEntryToListItem(e));
}

/**
 * Compact facet index for CatalogFilters — O(index) build, tiny RSC props
 * (integer rows instead of N product DTOs).
 */
export async function getCachedPublicCatalogFacets(filters?: {
  q?: string;
}): Promise<CompactCatalogFacets> {
  const index = await getCachedProductIndex();
  const filtered = filterProductIndexEntries(index.entries, {
    publicOnly: true,
    q: filters?.q,
  });
  return buildCompactCatalogFacets(
    filtered.map((e) => ({
      categoriasIds: e.categoriasIds,
      tamanhos: e.tamanhos,
      cores: e.cores,
    })),
  );
}

/** Resolve products by id — O(K) single-file reads. */
export async function getCachedProductsByIds(
  ids: string[],
): Promise<Product[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const results = await Promise.all(
    unique.map(async (id) => {
      try {
        return await getProductById(id);
      } catch {
        return null;
      }
    }),
  );
  return results.filter((p): p is Product => p !== null);
}

/** Resolve a category slug/id to the set of filter ids (node + active descendants). */
export async function resolveCategoryFilterIds(
  categoriaParam: string,
): Promise<string[] | null> {
  const all = await getCachedAllCategories();
  const active = filterEffectivelyActive(all);
  const match = active.find(
    (c) => c.slug === categoriaParam || c.id === categoriaParam,
  );
  if (!match) return null;
  return getFilterCategoryIds(match.id, all);
}

export type { ProductIndexEntry };
export { resolveProductIdBySlug };
