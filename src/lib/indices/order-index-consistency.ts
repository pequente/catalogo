import "server-only";
import { listJsonDir, readJson } from "@/src/lib/data";
import type { OrderIndexState } from "@/src/schemas/order-index";
import { orderSchema, type Order } from "@/src/schemas/order";
import { diffIndexEntryAgainstOrder } from "@/src/lib/indices/order-index-core";

export type OrderIndexConsistencyIssue =
  | {
      kind: "count_mismatch";
      indexTotal: number;
      fileCount: number;
      validFileCount: number;
    }
  | { kind: "missing_in_index"; orderId: string }
  | { kind: "orphan_in_index"; orderId: string }
  | { kind: "invalid_entity"; path: string; detail?: string }
  | {
      kind: "entry_mismatch";
      orderId: string;
      fields: string[];
    };

export type OrderIndexConsistencyReport = {
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  validFileCount: number;
  checkedEntries: number;
  issues: OrderIndexConsistencyIssue[];
};

export { diffIndexEntryAgainstOrder };

export async function auditOrderIndexConsistency(
  state: OrderIndexState | null,
): Promise<OrderIndexConsistencyReport> {
  const files = await listJsonDir("pedidos");
  const issues: OrderIndexConsistencyIssue[] = [];

  const orders: Order[] = [];
  const validIds = new Set<string>();

  for (const file of files) {
    const rel = `pedidos/${file}`;
    const raw = await readJson<unknown>(rel);
    const parsed = orderSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({
        kind: "invalid_entity",
        path: rel,
        detail: parsed.error.issues[0]?.message,
      });
      continue;
    }
    orders.push(parsed.data);
    validIds.add(parsed.data.id);
  }

  const indexTotal = state?.entries.length ?? -1;
  const validFileCount = orders.length;

  if (!state) {
    if (files.length > 0) {
      issues.push({
        kind: "count_mismatch",
        indexTotal: -1,
        fileCount: files.length,
        validFileCount,
      });
    }
    return {
      ok: issues.length === 0 && files.length === 0,
      indexTotal,
      fileCount: files.length,
      validFileCount,
      checkedEntries: 0,
      issues,
    };
  }

  if (indexTotal !== validFileCount) {
    issues.push({
      kind: "count_mismatch",
      indexTotal,
      fileCount: files.length,
      validFileCount,
    });
  }

  const indexById = new Map(state.entries.map((e) => [e.id, e]));

  for (const order of orders) {
    const entry = indexById.get(order.id);
    if (!entry) {
      issues.push({ kind: "missing_in_index", orderId: order.id });
      continue;
    }
    const fields = diffIndexEntryAgainstOrder(entry, order);
    if (fields.length > 0) {
      issues.push({ kind: "entry_mismatch", orderId: order.id, fields });
    }
  }

  for (const entry of state.entries) {
    if (!validIds.has(entry.id)) {
      issues.push({ kind: "orphan_in_index", orderId: entry.id });
    }
  }

  return {
    ok: issues.length === 0,
    indexTotal,
    fileCount: files.length,
    validFileCount,
    checkedEntries: orders.length,
    issues,
  };
}
