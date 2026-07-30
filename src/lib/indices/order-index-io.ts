import "server-only";
import { cache } from "react";
import { readJson } from "@/src/lib/data";
import { readEntityDir } from "@/src/lib/indices/read-entity-dir";
import {
  parseOrderManifestEntries,
  serializeOrderIndexWrites,
  stateFromOrderEntries,
  type OrderIndexJsonWrite,
} from "@/src/lib/indices/order-index-core";
import {
  ORDER_INDEX_MANIFEST_PATH,
  ORDER_INDEX_META_PATH,
  ORDER_INDEX_SHARDS_DIR,
} from "@/src/lib/indices/paths";
import {
  orderIndexEntrySchema,
  orderIndexManifestSchema,
  orderIndexShardSchema,
  orderToIndexEntry,
  type OrderIndexEntry,
  type OrderIndexState,
} from "@/src/schemas/order-index";
import { orderSchema } from "@/src/schemas/order";

async function readManifestFile(
  path: string,
): Promise<ReturnType<typeof orderIndexManifestSchema.parse> | null> {
  const raw = await readJson<unknown>(path);
  if (!raw) return null;
  const parsed = orderIndexManifestSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[order-index] invalid manifest ${path}`,
      parsed.error.flatten(),
    );
    return null;
  }
  return parsed.data;
}

async function loadEntriesFromShards(
  shardRelativePaths: string[],
): Promise<OrderIndexEntry[]> {
  const chunks = await Promise.all(
    shardRelativePaths.map(async (rel) => {
      const path = rel.startsWith("indices/")
        ? rel
        : rel.startsWith("pedidos/")
          ? `indices/${rel}`
          : `${ORDER_INDEX_SHARDS_DIR}/${rel.replace(/^.*\//, "")}`;
      const raw = await readJson<unknown>(path);
      if (!raw) {
        console.warn(`[order-index] missing shard ${path}`);
        return [] as OrderIndexEntry[];
      }
      const parsed = orderIndexShardSchema.safeParse(raw);
      if (!parsed.success) {
        const entriesRaw = (raw as { entries?: unknown }).entries;
        if (!Array.isArray(entriesRaw)) {
          console.warn(
            `[order-index] invalid shard ${path}`,
            parsed.error.flatten(),
          );
          return [] as OrderIndexEntry[];
        }
        return entriesRaw
          .map((e) => orderIndexEntrySchema.safeParse(e))
          .filter((r) => r.success)
          .map((r) => r.data);
      }
      return parsed.data.entries;
    }),
  );
  return chunks.flat();
}

/**
 * Load the order index state (1 manifest or meta + shards).
 * Returns null when no index files exist yet.
 */
export async function readOrderIndexState(): Promise<OrderIndexState | null> {
  const root = await readManifestFile(ORDER_INDEX_MANIFEST_PATH);
  if (root) {
    const direct = parseOrderManifestEntries(root);
    if (direct) {
      return stateFromOrderEntries(direct, root.updatedAt);
    }
    if (root.sharded && root.shards && root.shards.length > 0) {
      const entries = await loadEntriesFromShards(root.shards);
      if (entries.length !== root.total) {
        console.warn(
          `[order-index] shard entry count ${entries.length} !== meta.total ${root.total}`,
        );
      }
      return stateFromOrderEntries(entries, root.updatedAt);
    }
  }

  const meta = await readManifestFile(ORDER_INDEX_META_PATH);
  if (meta?.sharded && meta.shards && meta.shards.length > 0) {
    const entries = await loadEntriesFromShards(
      meta.shards.map((name) =>
        name.includes("/") ? name : `${ORDER_INDEX_SHARDS_DIR}/${name}`,
      ),
    );
    return stateFromOrderEntries(entries, meta.updatedAt);
  }

  return null;
}

/**
 * Request-scoped load. If index files are missing, rebuilds in-memory from
 * `pedidos/*` (does not persist — run `npm run indices:rebuild`).
 */
export const getOrderIndexState = cache(async (): Promise<OrderIndexState> => {
  const existing = await readOrderIndexState();
  if (existing) return existing;
  console.warn(
    "[order-index] missing — building in-memory from pedidos/* (run npm run indices:rebuild to persist)",
  );
  const { state } = await buildOrderIndexWritesFromDisk();
  return state;
});

/**
 * One-shot rebuild: scan `pedidos/*.json` and return serialized index writes.
 */
export async function buildOrderIndexWritesFromDisk(): Promise<{
  state: OrderIndexState;
  writes: OrderIndexJsonWrite[];
  fileCount: number;
  skipped: number;
}> {
  const { entities, fileCount, skipped } = await readEntityDir(
    "pedidos",
    orderSchema,
    "order-index",
  );

  const entries = entities.map((o) => orderToIndexEntry(o));
  const state = stateFromOrderEntries(entries);
  return {
    state,
    writes: serializeOrderIndexWrites(state),
    fileCount,
    skipped,
  };
}

/** Deep index ↔ entity audit. */
export async function validateOrderIndexConsistency(
  state?: OrderIndexState | null,
): Promise<{
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  deep: import("@/src/lib/indices/order-index-consistency").OrderIndexConsistencyReport;
}> {
  const { auditOrderIndexConsistency } = await import(
    "@/src/lib/indices/order-index-consistency"
  );
  const current = state === undefined ? await readOrderIndexState() : state;
  const deep = await auditOrderIndexConsistency(current);
  return {
    ok: deep.ok,
    indexTotal: deep.indexTotal,
    fileCount: deep.fileCount,
    deep,
  };
}

export { serializeOrderIndexWrites, ORDER_INDEX_MANIFEST_PATH };
