import "server-only";
import { commitFiles } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import {
  buildProductIndexWritesFromDisk,
  readProductIndexState,
  validateProductIndexConsistency,
} from "@/src/lib/indices/product-index-io";
import {
  serializeProductIndexWrites,
  upsertProductInIndex,
  upsertProductsInIndex,
  removeProductFromIndex,
  type ProductIndexJsonWrite,
} from "@/src/lib/indices/product-index-core";
import type { ProductIndexState } from "@/src/schemas/product-index";
import type { Product } from "@/src/schemas/product";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";

/**
 * Load index for a mutation. If files are missing, rebuild from disk so we
 * never commit a near-empty index over an existing catalog.
 */
export async function loadProductIndexForMutation(): Promise<ProductIndexState> {
  const existing = await readProductIndexState();
  if (existing) return existing;
  console.warn(
    "[product-index] index missing during mutation — rebuilding from produtos/*",
  );
  const { state } = await buildProductIndexWritesFromDisk();
  return state;
}

export function indexWritesAfterUpsert(
  state: ProductIndexState,
  product: Product,
): { state: ProductIndexState; writes: ProductIndexJsonWrite[] } {
  const next = upsertProductInIndex(state, product);
  return { state: next, writes: serializeProductIndexWrites(next) };
}

export function indexWritesAfterUpsertMany(
  state: ProductIndexState,
  products: Product[],
): { state: ProductIndexState; writes: ProductIndexJsonWrite[] } {
  const next = upsertProductsInIndex(state, products);
  return { state: next, writes: serializeProductIndexWrites(next) };
}

export function indexWritesAfterRemove(
  state: ProductIndexState,
  productId: string,
): { state: ProductIndexState; writes: ProductIndexJsonWrite[] } {
  const next = removeProductFromIndex(state, productId);
  return { state: next, writes: serializeProductIndexWrites(next) };
}

/** Persist a full rebuild (dev FS or GitHub commit). Recovery / repair path. */
export async function rebuildAndCommitProductIndices(message?: string): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  const { state, writes, fileCount, skipped } =
    await buildProductIndexWritesFromDisk();
  await commitFiles(
    buildMutationFiles({ jsonWrites: writes }),
    message ?? "chore(data): rebuild product indices",
  );
  const consistency = await validateProductIndexConsistency(state);
  revalidateStorefront(CACHE_TAGS.products, CACHE_TAGS.dashboard);
  return {
    total: state.entries.length,
    fileCount,
    skipped,
    ok: consistency.ok,
    deepIssues: consistency.deep.issues.length,
  };
}

/**
 * Fase 5 repair: regenerate all product indices from `produtos/*.json`.
 * Alias of rebuild with an explicit recovery commit message.
 */
export async function repairProductIndices(): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  return rebuildAndCommitProductIndices(
    "fix(data): repair product indices from entity JSON",
  );
}
