import "server-only";
import { cache } from "react";
import { listJsonDir, readJson } from "@/src/lib/data";
import {
  parseManifestEntries,
  serializeProductIndexWrites,
  stateFromEntries,
  type ProductIndexJsonWrite,
} from "@/src/lib/indices/product-index-core";
import {
  PRODUCT_INDEX_MANIFEST_PATH,
  PRODUCT_INDEX_META_PATH,
  PRODUCT_INDEX_SHARDS_DIR,
  PRODUCT_SLUG_INDEX_PATH,
  PRODUCT_REFERENCIA_INDEX_PATH,
  PRODUCT_CATEGORIA_INDEX_PATH,
} from "@/src/lib/indices/paths";
import {
  productIndexEntrySchema,
  productIndexManifestSchema,
  productIndexShardSchema,
  productSlugIndexSchema,
  productReferenciaIndexSchema,
  productCategoriaIndexSchema,
  productToIndexEntry,
  type ProductIndexEntry,
  type ProductIndexState,
  type ProductSlugIndex,
} from "@/src/schemas/product-index";
import { productSchema } from "@/src/schemas/product";

async function readManifestFile(
  path: string,
): Promise<ReturnType<typeof productIndexManifestSchema.parse> | null> {
  const raw = await readJson<unknown>(path);
  if (!raw) return null;
  const parsed = productIndexManifestSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[product-index] invalid manifest ${path}`,
      parsed.error.flatten(),
    );
    return null;
  }
  return parsed.data;
}

async function loadEntriesFromShards(
  shardRelativePaths: string[],
): Promise<ProductIndexEntry[]> {
  const chunks = await Promise.all(
    shardRelativePaths.map(async (rel) => {
      const path = rel.startsWith("indices/")
        ? rel
        : rel.startsWith("produtos/")
          ? `indices/${rel}`
          : `${PRODUCT_INDEX_SHARDS_DIR}/${rel.replace(/^.*\//, "")}`;
      const raw = await readJson<unknown>(path);
      if (!raw) {
        console.warn(`[product-index] missing shard ${path}`);
        return [] as ProductIndexEntry[];
      }
      const parsed = productIndexShardSchema.safeParse(raw);
      if (!parsed.success) {
        // Allow raw { entries } from meta-only layouts.
        const entriesRaw = (raw as { entries?: unknown }).entries;
        if (!Array.isArray(entriesRaw)) {
          console.warn(
            `[product-index] invalid shard ${path}`,
            parsed.error.flatten(),
          );
          return [] as ProductIndexEntry[];
        }
        return entriesRaw
          .map((e) => productIndexEntrySchema.safeParse(e))
          .filter((r) => r.success)
          .map((r) => r.data);
      }
      return parsed.data.entries;
    }),
  );
  return chunks.flat();
}

/**
 * Load the product index state (1 manifest or meta + shards).
 * Returns null when no index files exist yet.
 */
export async function readProductIndexState(): Promise<ProductIndexState | null> {
  const root = await readManifestFile(PRODUCT_INDEX_MANIFEST_PATH);
  if (root) {
    const direct = parseManifestEntries(root);
    if (direct) {
      return stateFromEntries(direct, root.updatedAt);
    }
    if (root.sharded && root.shards && root.shards.length > 0) {
      const entries = await loadEntriesFromShards(root.shards);
      if (entries.length !== root.total) {
        console.warn(
          `[product-index] shard entry count ${entries.length} !== meta.total ${root.total}`,
        );
      }
      return stateFromEntries(entries, root.updatedAt);
    }
  }

  const meta = await readManifestFile(PRODUCT_INDEX_META_PATH);
  if (meta?.sharded && meta.shards && meta.shards.length > 0) {
    const entries = await loadEntriesFromShards(
      meta.shards.map((name) =>
        name.includes("/") ? name : `${PRODUCT_INDEX_SHARDS_DIR}/${name}`,
      ),
    );
    return stateFromEntries(entries, meta.updatedAt);
  }

  return null;
}

/**
 * Request-scoped load. If index files are missing, rebuilds in-memory from
 * `produtos/*` (does not persist — run `npm run indices:rebuild`).
 */
export const getProductIndexState = cache(
  async (): Promise<ProductIndexState> => {
    const existing = await readProductIndexState();
    if (existing) return existing;
    console.warn(
      "[product-index] missing — building in-memory from produtos/* (run npm run indices:rebuild to persist)",
    );
    const { state } = await buildProductIndexWritesFromDisk();
    return state;
  },
);

/** Prefer the lean slug map file; fall back to full index state. */
export async function readProductSlugIndex(): Promise<ProductSlugIndex | null> {
  const raw = await readJson<unknown>(PRODUCT_SLUG_INDEX_PATH);
  if (raw) {
    const parsed = productSlugIndexSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    console.warn(
      "[product-index] invalid slug index",
      parsed.error.flatten(),
    );
  }
  const state = await readProductIndexState();
  if (!state) return null;
  return {
    schemaVersion: 1,
    updatedAt: state.updatedAt,
    bySlug: state.bySlug,
  };
}

export async function resolveProductIdBySlug(
  slug: string,
): Promise<string | null> {
  const slugIndex = await readProductSlugIndex();
  if (slugIndex?.bySlug[slug]) return slugIndex.bySlug[slug];
  const state = await getProductIndexState();
  return state.bySlug[slug] ?? null;
}

/**
 * One-shot rebuild: scan `produtos/*.json` and return serialized index writes.
 * Does not commit — caller passes into commitFiles / fs write.
 */
export async function buildProductIndexWritesFromDisk(): Promise<{
  state: ProductIndexState;
  writes: ProductIndexJsonWrite[];
  fileCount: number;
  skipped: number;
}> {
  const files = await listJsonDir("produtos");
  const entries: ProductIndexEntry[] = [];
  let skipped = 0;

  const products = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`produtos/${file}`);
      const parsed = productSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(
          `[product-index] skip invalid produtos/${file}`,
          parsed.error.flatten(),
        );
        return null;
      }
      return parsed.data;
    }),
  );

  for (const product of products) {
    if (!product) {
      skipped += 1;
      continue;
    }
    entries.push(productToIndexEntry(product));
  }

  const state = stateFromEntries(entries);
  return {
    state,
    writes: serializeProductIndexWrites(state),
    fileCount: files.length,
    skipped,
  };
}

/** Deep index ↔ entity audit (Fase 5). Count-only is insufficient. */
export async function validateProductIndexConsistency(
  state?: ProductIndexState | null,
): Promise<{
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  deep: import("@/src/lib/indices/product-index-consistency").IndexConsistencyReport;
}> {
  const { auditProductIndexConsistency } = await import(
    "@/src/lib/indices/product-index-consistency"
  );
  const current =
    state === undefined ? await readProductIndexState() : state;
  const deep = await auditProductIndexConsistency(current);
  return {
    ok: deep.ok,
    indexTotal: deep.indexTotal,
    fileCount: deep.fileCount,
    deep,
  };
}

export async function readReferenciaIndex() {
  const raw = await readJson<unknown>(PRODUCT_REFERENCIA_INDEX_PATH);
  if (!raw) return null;
  const parsed = productReferenciaIndexSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function readCategoriaIndex() {
  const raw = await readJson<unknown>(PRODUCT_CATEGORIA_INDEX_PATH);
  if (!raw) return null;
  const parsed = productCategoriaIndexSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export {
  serializeProductIndexWrites,
  PRODUCT_INDEX_MANIFEST_PATH,
  PRODUCT_SLUG_INDEX_PATH,
};
