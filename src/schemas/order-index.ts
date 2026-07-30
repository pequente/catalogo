import { z } from "zod";
import {
  orderCanalSchema,
  orderItemSchema,
  orderStatusSchema,
  type Order,
} from "@/src/schemas/order";
import { isoDateSchema, uuidSchema } from "./common";

/** Bump when index entry shape or file layout changes incompatibly. */
export const ORDER_INDEX_SCHEMA_VERSION = 1 as const;

/** Entries per shard when the catalog exceeds the single-manifest threshold. */
export const ORDER_INDEX_SHARD_SIZE = 500;

/**
 * Prefer a single `indices/pedidos.json` until this many entries; above that,
 * write `indices/pedidos/meta.json` + `page-NNN.json` shards (O(shards) reads).
 */
export const ORDER_INDEX_SHARD_THRESHOLD = 1500;

/** Lean line item — same shape as order items (listing + dashboard). */
export const orderIndexItemSchema = orderItemSchema;

export type OrderIndexItem = z.infer<typeof orderIndexItemSchema>;

/**
 * Lean order entry for listing + dashboard aggregates.
 * Omits `observacao` (detail-only); includes everything aggregates need.
 */
export const orderIndexEntrySchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  status: orderStatusSchema,
  canal: orderCanalSchema,
  clienteId: uuidSchema.nullable().optional(),
  itens: z.array(orderIndexItemSchema).min(1),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
  /** Relative entity path, e.g. `pedidos/{id}.json`. */
  path: z.string().min(1),
});

export type OrderIndexEntry = z.infer<typeof orderIndexEntrySchema>;

export const orderIndexManifestSchema = z.object({
  schemaVersion: z.literal(ORDER_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  total: z.number().int().min(0),
  sharded: z.boolean().optional(),
  shardSize: z.number().int().positive().optional(),
  shards: z.array(z.string().min(1)).optional(),
  entries: z.array(orderIndexEntrySchema).optional(),
});

export type OrderIndexManifest = z.infer<typeof orderIndexManifestSchema>;

export const orderIndexShardSchema = z.object({
  schemaVersion: z.literal(ORDER_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  shard: z.number().int().min(1),
  entries: z.array(orderIndexEntrySchema),
});

export type OrderIndexShard = z.infer<typeof orderIndexShardSchema>;

/** In-memory working set used by readers and atomic mutation helpers. */
export type OrderIndexState = {
  updatedAt: string;
  entries: OrderIndexEntry[];
};

export function orderEntityPath(id: string): string {
  return `pedidos/${id}.json`;
}

/** Build a lean index entry from a full Order entity. */
export function orderToIndexEntry(order: Order): OrderIndexEntry {
  return {
    id: order.id,
    versao: order.versao,
    status: order.status,
    canal: order.canal,
    ...(order.clienteId !== undefined ? { clienteId: order.clienteId } : {}),
    itens: order.itens.map((item) => ({
      produtoId: item.produtoId,
      varianteId: item.varianteId,
      nomeProduto: item.nomeProduto,
      tamanho: item.tamanho,
      cor: item.cor,
      ...(item.sku ? { sku: item.sku } : {}),
      ...(item.referenciaProduto
        ? { referenciaProduto: item.referenciaProduto }
        : {}),
      quantidade: item.quantidade,
      precoUnitario: item.precoUnitario,
    })),
    criadoEm: order.criadoEm,
    atualizadoEm: order.atualizadoEm,
    path: orderEntityPath(order.id),
  };
}

/** Strip path for Order-compatible listing DTOs. */
export function indexEntryToOrder(entry: OrderIndexEntry): Order {
  const { path: _path, ...order } = entry;
  void _path;
  return order;
}

export function emptyOrderIndexState(
  updatedAt = new Date().toISOString(),
): OrderIndexState {
  return { updatedAt, entries: [] };
}

/** Sort newest-first by criadoEm (matches legacy listOrders). */
export function sortOrderIndexEntries(
  entries: OrderIndexEntry[],
): OrderIndexEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.criadoEm.localeCompare(a.criadoEm);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}
