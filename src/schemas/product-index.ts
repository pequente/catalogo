import { z } from "zod";
import {
  productListItemSchema,
  toProductListItem,
  type ProductListItem,
} from "@/src/schemas/product-list";
import type { Product } from "@/src/schemas/product";

/** Bump when index entry shape or file layout changes incompatibly. */
export const PRODUCT_INDEX_SCHEMA_VERSION = 1 as const;

/** Entries per shard when the catalog exceeds the single-manifest threshold. */
export const PRODUCT_INDEX_SHARD_SIZE = 500;

/**
 * Prefer a single `indices/produtos.json` until this many entries; above that,
 * write `indices/produtos/meta.json` + `page-NNN.json` shards (O(shards) reads).
 */
export const PRODUCT_INDEX_SHARD_THRESHOLD = 1500;

export const productIndexEntrySchema = productListItemSchema.extend({
  /** Relative entity path, e.g. `produtos/{id}.json`. */
  path: z.string().min(1),
  /** ISO timestamp — index sort key (newest first). */
  atualizadoEm: z.string().min(1),
});

export type ProductIndexEntry = z.infer<typeof productIndexEntrySchema>;

export const productIndexManifestSchema = z.object({
  schemaVersion: z.literal(PRODUCT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  total: z.number().int().min(0),
  /** Present when this file is a sharded catalog meta pointer. */
  sharded: z.boolean().optional(),
  shardSize: z.number().int().positive().optional(),
  shards: z.array(z.string().min(1)).optional(),
  entries: z.array(productIndexEntrySchema).optional(),
});

export type ProductIndexManifest = z.infer<typeof productIndexManifestSchema>;

export const productIndexShardSchema = z.object({
  schemaVersion: z.literal(PRODUCT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  shard: z.number().int().min(1),
  entries: z.array(productIndexEntrySchema),
});

export type ProductIndexShard = z.infer<typeof productIndexShardSchema>;

export const productSlugIndexSchema = z.object({
  schemaVersion: z.literal(PRODUCT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  bySlug: z.record(z.string(), z.string().uuid()),
});

export type ProductSlugIndex = z.infer<typeof productSlugIndexSchema>;

export const productReferenciaIndexSchema = z.object({
  schemaVersion: z.literal(PRODUCT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  /** Keys are lowercased normalized referência. */
  byReferencia: z.record(z.string(), z.string().uuid()),
});

export type ProductReferenciaIndex = z.infer<typeof productReferenciaIndexSchema>;

export const productCategoriaIndexSchema = z.object({
  schemaVersion: z.literal(PRODUCT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  /** categoriaId → product ids (unsorted). */
  byCategoria: z.record(z.string().uuid(), z.array(z.string().uuid())),
});

export type ProductCategoriaIndex = z.infer<typeof productCategoriaIndexSchema>;

/** In-memory working set used by readers and atomic mutation helpers. */
export type ProductIndexState = {
  updatedAt: string;
  entries: ProductIndexEntry[];
  bySlug: Record<string, string>;
  byReferencia: Record<string, string>;
  byCategoria: Record<string, string[]>;
};

export function productEntityPath(id: string): string {
  return `produtos/${id}.json`;
}

/** Build a lean index entry from a full Product entity. */
export function productToIndexEntry(product: Product): ProductIndexEntry {
  const list: ProductListItem = toProductListItem(product);
  return {
    ...list,
    path: productEntityPath(product.id),
    atualizadoEm: product.atualizadoEm,
  };
}

export function emptyProductIndexState(updatedAt = new Date().toISOString()): ProductIndexState {
  return {
    updatedAt,
    entries: [],
    bySlug: {},
    byReferencia: {},
    byCategoria: {},
  };
}

/** Sort newest-first (matches legacy listAllProducts). */
export function sortProductIndexEntries(
  entries: ProductIndexEntry[],
): ProductIndexEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.atualizadoEm.localeCompare(a.atualizadoEm);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}
