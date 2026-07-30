import { normalizeProductReferencia } from "@/src/lib/product-referencia";
import type { Product } from "@/src/schemas/product";
import type { ProductListItem } from "@/src/schemas/product-list";
import {
  emptyProductIndexState,
  productToIndexEntry,
  sortProductIndexEntries,
  type ProductIndexEntry,
  type ProductIndexState,
  type ProductIndexManifest,
  type ProductSlugIndex,
  type ProductReferenciaIndex,
  type ProductCategoriaIndex,
  PRODUCT_INDEX_SCHEMA_VERSION,
  PRODUCT_INDEX_SHARD_SIZE,
  PRODUCT_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/product-index";
import {
  PRODUCT_INDEX_MANIFEST_PATH,
  PRODUCT_INDEX_META_PATH,
  PRODUCT_SLUG_INDEX_PATH,
  PRODUCT_REFERENCIA_INDEX_PATH,
  PRODUCT_CATEGORIA_INDEX_PATH,
  DASHBOARD_CATALOG_INDEX_PATH,
  productIndexShardPath,
} from "@/src/lib/indices/paths";
import { computeDashboardCatalogFromEntries } from "@/src/schemas/dashboard-catalog-index";

export type ProductIndexListFilters = {
  q?: string;
  status?: Product["status"];
  categoria?: string;
  categoriaIds?: string[];
  tamanho?: string;
  cor?: string;
  destaque?: boolean;
  lancamento?: boolean;
  publicOnly?: boolean;
};

/** Rebuild secondary maps from entries (source of truth). */
export function rebuildSecondaryMaps(
  entries: ProductIndexEntry[],
): Pick<ProductIndexState, "bySlug" | "byReferencia" | "byCategoria"> {
  const bySlug: Record<string, string> = {};
  const byReferencia: Record<string, string> = {};
  const byCategoria: Record<string, string[]> = {};

  for (const entry of entries) {
    bySlug[entry.slug] = entry.id;
    const refKey = normalizeProductReferencia(entry.referencia).toLowerCase();
    if (refKey) {
      byReferencia[refKey] = entry.id;
    }
    for (const catId of entry.categoriasIds) {
      const list = byCategoria[catId] ?? [];
      list.push(entry.id);
      byCategoria[catId] = list;
    }
  }

  return { bySlug, byReferencia, byCategoria };
}

export function stateFromEntries(
  entries: ProductIndexEntry[],
  updatedAt = new Date().toISOString(),
): ProductIndexState {
  const sorted = sortProductIndexEntries(entries);
  return {
    updatedAt,
    entries: sorted,
    ...rebuildSecondaryMaps(sorted),
  };
}

export function upsertProductInIndex(
  state: ProductIndexState,
  product: Product,
): ProductIndexState {
  const entry = productToIndexEntry(product);
  const without = state.entries.filter((e) => e.id !== product.id);
  return stateFromEntries([...without, entry], new Date().toISOString());
}

export function upsertProductsInIndex(
  state: ProductIndexState,
  products: Product[],
): ProductIndexState {
  if (products.length === 0) return state;
  const byId = new Map(state.entries.map((e) => [e.id, e]));
  for (const product of products) {
    byId.set(product.id, productToIndexEntry(product));
  }
  return stateFromEntries([...byId.values()], new Date().toISOString());
}

export function removeProductFromIndex(
  state: ProductIndexState,
  productId: string,
): ProductIndexState {
  if (!state.entries.some((e) => e.id === productId)) return state;
  return stateFromEntries(
    state.entries.filter((e) => e.id !== productId),
    new Date().toISOString(),
  );
}

/**
 * Filter index entries for list pages.
 * Search `q` matches nome / slug / referência (Fase 4 admin contract — not full descricao).
 */
export function filterProductIndexEntries(
  entries: readonly ProductIndexEntry[],
  filters?: ProductIndexListFilters,
): ProductIndexEntry[] {
  let items = entries as ProductIndexEntry[];

  if (filters?.publicOnly) {
    items = items.filter(
      (p) => p.status === "ativo" || p.status === "esgotado",
    );
  }
  if (filters?.status) {
    items = items.filter((p) => p.status === filters.status);
  }

  const categoriaIds =
    filters?.categoriaIds ??
    (filters?.categoria ? [filters.categoria] : undefined);

  if (categoriaIds && categoriaIds.length > 0) {
    const idSet = new Set(categoriaIds);
    items = items.filter((p) =>
      p.categoriasIds.some((id) => idSet.has(id)),
    );
  }
  if (filters?.tamanho) {
    items = items.filter((p) => p.tamanhos.includes(filters.tamanho!));
  }
  if (filters?.cor) {
    const cor = filters.cor.toLowerCase();
    items = items.filter((p) =>
      p.cores.some((c) => c.toLowerCase() === cor),
    );
  }
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    items = items.filter(
      (p) =>
        p.nome.toLowerCase().includes(q) ||
        p.slug.includes(q) ||
        normalizeProductReferencia(p.referencia).toLowerCase().includes(q),
    );
  }
  if (filters?.destaque === true) {
    items = items.filter((p) => p.destaque);
  }
  if (filters?.lancamento === true) {
    items = items.filter((p) => p.lancamento);
  }

  return items;
}

export function findSlugConflict(
  state: ProductIndexState,
  slug: string,
  excludeId?: string,
): string | null {
  const owner = state.bySlug[slug];
  if (!owner || owner === excludeId) return null;
  return owner;
}

export function findReferenciaConflict(
  state: ProductIndexState,
  referencia: string,
  excludeId?: string,
): { id: string; nome: string } | null {
  const key = normalizeProductReferencia(referencia).toLowerCase();
  if (!key) return null;
  const owner = state.byReferencia[key];
  if (!owner || owner === excludeId) return null;
  const entry = state.entries.find((e) => e.id === owner);
  return { id: owner, nome: entry?.nome ?? owner };
}

export function categoryHasProducts(
  state: ProductIndexState,
  categoriaId: string,
): boolean {
  const ids = state.byCategoria[categoriaId];
  return Boolean(ids && ids.length > 0);
}

/** Strip entry to list DTO fields (drop path / atualizadoEm). */
export function indexEntryToListItem(entry: ProductIndexEntry): ProductListItem {
  const {
    path: _path,
    atualizadoEm: _at,
    ...list
  } = entry;
  void _path;
  void _at;
  return list;
}

export type ProductIndexJsonWrite = { path: string; data: unknown };

/**
 * Serialize state into atomic jsonWrites for commitFiles.
 * Chooses single manifesto vs shards based on entry count.
 */
export function serializeProductIndexWrites(
  state: ProductIndexState,
): ProductIndexJsonWrite[] {
  const updatedAt = state.updatedAt;
  const total = state.entries.length;
  const writes: ProductIndexJsonWrite[] = [];

  const slugDoc: ProductSlugIndex = {
    schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
    updatedAt,
    bySlug: state.bySlug,
  };
  const refDoc: ProductReferenciaIndex = {
    schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
    updatedAt,
    byReferencia: state.byReferencia,
  };
  const catDoc: ProductCategoriaIndex = {
    schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
    updatedAt,
    byCategoria: state.byCategoria,
  };

  writes.push({ path: PRODUCT_SLUG_INDEX_PATH, data: slugDoc });
  writes.push({ path: PRODUCT_REFERENCIA_INDEX_PATH, data: refDoc });
  writes.push({ path: PRODUCT_CATEGORIA_INDEX_PATH, data: catDoc });
  // Fase 4 — catalog KPIs co-committed with every product index write.
  writes.push({
    path: DASHBOARD_CATALOG_INDEX_PATH,
    data: computeDashboardCatalogFromEntries(state.entries, updatedAt),
  });

  if (total <= PRODUCT_INDEX_SHARD_THRESHOLD) {
    const manifest: ProductIndexManifest = {
      schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: false,
      entries: state.entries,
    };
    writes.push({ path: PRODUCT_INDEX_MANIFEST_PATH, data: manifest });
    return writes;
  }

  const shardSize = PRODUCT_INDEX_SHARD_SIZE;
  const shardNames: string[] = [];
  let shardNum = 1;
  for (let i = 0; i < state.entries.length; i += shardSize) {
    const chunk = state.entries.slice(i, i + shardSize);
    const name = `page-${String(shardNum).padStart(3, "0")}.json`;
    shardNames.push(name);
    writes.push({
      path: productIndexShardPath(shardNum),
      data: {
        schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
        updatedAt,
        shard: shardNum,
        entries: chunk,
      },
    });
    shardNum += 1;
  }

  const meta: ProductIndexManifest = {
    schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
    updatedAt,
    total,
    sharded: true,
    shardSize,
    shards: shardNames,
  };
  writes.push({ path: PRODUCT_INDEX_META_PATH, data: meta });

  // Keep a tiny pointer at the legacy manifest path so readers find the layout.
  writes.push({
    path: PRODUCT_INDEX_MANIFEST_PATH,
    data: {
      schemaVersion: PRODUCT_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: true,
      shardSize,
      shards: shardNames.map((name) => `produtos/${name}`),
    } satisfies ProductIndexManifest,
  });

  return writes;
}

export function parseManifestEntries(
  manifest: ProductIndexManifest,
): ProductIndexEntry[] | null {
  if (manifest.entries && !manifest.sharded) {
    return manifest.entries;
  }
  return null;
}

export { emptyProductIndexState, PRODUCT_INDEX_MANIFEST_PATH };
