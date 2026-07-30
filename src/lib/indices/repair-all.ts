import "server-only";
import { repairClientIndices } from "@/src/lib/indices/client-index-mutate";
import { repairOrderIndices } from "@/src/lib/indices/order-index-mutate";
import { repairProductIndices } from "@/src/lib/indices/product-index-mutate";
import type { DataMigration } from "@/src/lib/data/migrations/types";

export async function repairAllIndices(): Promise<{
  ok: boolean;
  products: Awaited<ReturnType<typeof repairProductIndices>>;
  orders: Awaited<ReturnType<typeof repairOrderIndices>>;
  clients: Awaited<ReturnType<typeof repairClientIndices>>;
}> {
  const products = await repairProductIndices();
  const orders = await repairOrderIndices();
  const clients = await repairClientIndices();
  return {
    ok: products.ok && orders.ok && clients.ok,
    products,
    orders,
    clients,
  };
}

export const migrationIndicesRepair: DataMigration = {
  id: "2026-07-indices-repair",
  order: 90,
  description: "Repair índices derivados a partir dos JSON de entidades",
  async run(ctx) {
    if (ctx.dryRun) {
      return {
        changes: [],
        stats: { note: "indices repair skipped in dry-run" },
      };
    }
    const result = await repairAllIndices();
    if (!result.ok) {
      throw new Error(
        `[migrations] indices repair failed: ${JSON.stringify({
          products: result.products.ok,
          orders: result.orders.ok,
          clients: result.clients.ok,
        })}`,
      );
    }
    return {
      changes: [],
      stats: {
        products: result.products.total,
        orders: result.orders.total,
        clients: result.clients.total,
      },
      selfCommitted: true,
    };
  },
};
