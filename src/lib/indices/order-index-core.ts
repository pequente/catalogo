import type { Order, OrderCanal, OrderStatus } from "@/src/schemas/order";
import {
  emptyOrderIndexState,
  orderToIndexEntry,
  sortOrderIndexEntries,
  type OrderIndexEntry,
  type OrderIndexState,
  type OrderIndexManifest,
  ORDER_INDEX_SCHEMA_VERSION,
  ORDER_INDEX_SHARD_SIZE,
  ORDER_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/order-index";
import {
  ORDER_INDEX_MANIFEST_PATH,
  ORDER_INDEX_META_PATH,
  orderIndexShardPath,
} from "@/src/lib/indices/paths";

export type OrderIndexListFilters = {
  status?: OrderStatus;
  canal?: OrderCanal;
  q?: string;
};

export function diffIndexEntryAgainstOrder(
  entry: OrderIndexEntry,
  order: Order,
): string[] {
  const expected = orderToIndexEntry(order);
  const fields: string[] = [];
  if (entry.id !== expected.id) fields.push("id");
  if (entry.versao !== expected.versao) fields.push("versao");
  if (entry.status !== expected.status) fields.push("status");
  if (entry.canal !== expected.canal) fields.push("canal");
  if ((entry.clienteId ?? null) !== (expected.clienteId ?? null)) {
    fields.push("clienteId");
  }
  if (entry.criadoEm !== expected.criadoEm) fields.push("criadoEm");
  if (entry.atualizadoEm !== expected.atualizadoEm) fields.push("atualizadoEm");
  if (entry.path !== expected.path) fields.push("path");
  if (JSON.stringify(entry.itens) !== JSON.stringify(expected.itens)) {
    fields.push("itens");
  }
  return fields;
}

export function stateFromOrderEntries(
  entries: OrderIndexEntry[],
  updatedAt = new Date().toISOString(),
): OrderIndexState {
  return {
    updatedAt,
    entries: sortOrderIndexEntries(entries),
  };
}

export function upsertOrderInIndex(
  state: OrderIndexState,
  order: Order,
): OrderIndexState {
  const entry = orderToIndexEntry(order);
  const without = state.entries.filter((e) => e.id !== order.id);
  return stateFromOrderEntries([...without, entry], new Date().toISOString());
}

export function removeOrderFromIndex(
  state: OrderIndexState,
  orderId: string,
): OrderIndexState {
  if (!state.entries.some((e) => e.id === orderId)) return state;
  return stateFromOrderEntries(
    state.entries.filter((e) => e.id !== orderId),
    new Date().toISOString(),
  );
}

export function filterOrderIndexEntries(
  entries: readonly OrderIndexEntry[],
  filters?: OrderIndexListFilters,
): OrderIndexEntry[] {
  let items = entries as OrderIndexEntry[];

  if (filters?.status) {
    items = items.filter((o) => o.status === filters.status);
  }
  if (filters?.canal) {
    items = items.filter((o) => o.canal === filters.canal);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.itens.some(
          (item) =>
            item.nomeProduto.toLowerCase().includes(q) ||
            (item.referenciaProduto ?? "").toLowerCase().includes(q),
        ),
    );
  }

  return items;
}

export type OrderIndexJsonWrite = { path: string; data: unknown };

export function serializeOrderIndexWrites(
  state: OrderIndexState,
): OrderIndexJsonWrite[] {
  const updatedAt = state.updatedAt;
  const total = state.entries.length;
  const writes: OrderIndexJsonWrite[] = [];

  if (total <= ORDER_INDEX_SHARD_THRESHOLD) {
    const manifest: OrderIndexManifest = {
      schemaVersion: ORDER_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: false,
      entries: state.entries,
    };
    writes.push({ path: ORDER_INDEX_MANIFEST_PATH, data: manifest });
    return writes;
  }

  const shardSize = ORDER_INDEX_SHARD_SIZE;
  const shardNames: string[] = [];
  let shardNum = 1;
  for (let i = 0; i < state.entries.length; i += shardSize) {
    const chunk = state.entries.slice(i, i + shardSize);
    const name = `page-${String(shardNum).padStart(3, "0")}.json`;
    shardNames.push(name);
    writes.push({
      path: orderIndexShardPath(shardNum),
      data: {
        schemaVersion: ORDER_INDEX_SCHEMA_VERSION,
        updatedAt,
        shard: shardNum,
        entries: chunk,
      },
    });
    shardNum += 1;
  }

  const meta: OrderIndexManifest = {
    schemaVersion: ORDER_INDEX_SCHEMA_VERSION,
    updatedAt,
    total,
    sharded: true,
    shardSize,
    shards: shardNames,
  };
  writes.push({ path: ORDER_INDEX_META_PATH, data: meta });

  writes.push({
    path: ORDER_INDEX_MANIFEST_PATH,
    data: {
      schemaVersion: ORDER_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: true,
      shardSize,
      shards: shardNames.map((name) => `pedidos/${name}`),
    } satisfies OrderIndexManifest,
  });

  return writes;
}

export function parseOrderManifestEntries(
  manifest: OrderIndexManifest,
): OrderIndexEntry[] | null {
  if (manifest.entries && !manifest.sharded) {
    return manifest.entries;
  }
  return null;
}

export { emptyOrderIndexState, ORDER_INDEX_MANIFEST_PATH };
