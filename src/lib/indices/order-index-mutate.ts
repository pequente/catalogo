import "server-only";
import { commitFiles } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import {
  buildOrderIndexWritesFromDisk,
  readOrderIndexState,
  validateOrderIndexConsistency,
} from "@/src/lib/indices/order-index-io";
import {
  serializeOrderIndexWrites,
  upsertOrderInIndex,
  removeOrderFromIndex,
  type OrderIndexJsonWrite,
} from "@/src/lib/indices/order-index-core";
import type { OrderIndexState } from "@/src/schemas/order-index";
import type { Order } from "@/src/schemas/order";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";

/**
 * Load index for a mutation. If files are missing, rebuild from disk so we
 * never commit a near-empty index over an existing catalog.
 */
export async function loadOrderIndexForMutation(): Promise<OrderIndexState> {
  const existing = await readOrderIndexState();
  if (existing) return existing;
  console.warn(
    "[order-index] index missing during mutation — rebuilding from pedidos/*",
  );
  const { state } = await buildOrderIndexWritesFromDisk();
  return state;
}

export function orderIndexWritesAfterUpsert(
  state: OrderIndexState,
  order: Order,
): { state: OrderIndexState; writes: OrderIndexJsonWrite[] } {
  const next = upsertOrderInIndex(state, order);
  return { state: next, writes: serializeOrderIndexWrites(next) };
}

export function orderIndexWritesAfterRemove(
  state: OrderIndexState,
  orderId: string,
): { state: OrderIndexState; writes: OrderIndexJsonWrite[] } {
  const next = removeOrderFromIndex(state, orderId);
  return { state: next, writes: serializeOrderIndexWrites(next) };
}

export async function rebuildAndCommitOrderIndices(message?: string): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  const { state, writes, fileCount, skipped } =
    await buildOrderIndexWritesFromDisk();
  await commitFiles(
    buildMutationFiles({ jsonWrites: writes }),
    message ?? "chore(data): rebuild order indices",
  );
  const consistency = await validateOrderIndexConsistency(state);
  revalidateStorefront(CACHE_TAGS.orders, CACHE_TAGS.dashboard);
  return {
    total: state.entries.length,
    fileCount,
    skipped,
    ok: consistency.ok,
    deepIssues: consistency.deep.issues.length,
  };
}

export async function repairOrderIndices(): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  return rebuildAndCommitOrderIndices(
    "fix(data): repair order indices from entity JSON",
  );
}
