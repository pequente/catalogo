import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Order } from "@/src/schemas/order";
import {
  emptyOrderIndexState,
  orderToIndexEntry,
  ORDER_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/order-index";
import {
  filterOrderIndexEntries,
  removeOrderFromIndex,
  serializeOrderIndexWrites,
  stateFromOrderEntries,
  upsertOrderInIndex,
} from "@/src/lib/indices/order-index-core";

function makeOrder(
  overrides: Partial<Order> & Pick<Order, "id">,
): Order {
  const now = "2026-07-21T12:00:00.000Z";
  return {
    id: overrides.id,
    versao: overrides.versao ?? 1,
    status: overrides.status ?? "confirmado",
    canal: overrides.canal ?? "whatsapp",
    clienteId: overrides.clienteId ?? null,
    itens: overrides.itens ?? [
      {
        produtoId: "11111111-1111-4111-8111-111111111111",
        varianteId: "22222222-2222-4222-8222-222222222222",
        nomeProduto: "Camiseta",
        tamanho: "M",
        cor: "Preto",
        quantidade: 2,
        precoUnitario: 50,
      },
    ],
    criadoEm: overrides.criadoEm ?? now,
    atualizadoEm: overrides.atualizadoEm ?? now,
  };
}

describe("order-index-core", () => {
  it("builds lean entry with path and itens", () => {
    const order = makeOrder({
      id: "33333333-3333-4333-8333-333333333333",
      observacao: "não vai ao índice",
    });
    const entry = orderToIndexEntry(order);
    assert.equal(entry.id, order.id);
    assert.equal(entry.path, `pedidos/${order.id}.json`);
    assert.equal(entry.itens.length, 1);
    assert.equal(entry.itens[0]!.nomeProduto, "Camiseta");
    assert.equal("observacao" in entry, false);
  });

  it("upserts and removes", () => {
    let state = emptyOrderIndexState();
    const a = makeOrder({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" });
    const b = makeOrder({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      criadoEm: "2026-07-20T12:00:00.000Z",
    });
    state = upsertOrderInIndex(state, a);
    state = upsertOrderInIndex(state, b);
    assert.equal(state.entries.length, 2);
    assert.equal(state.entries[0]!.id, a.id);
    state = removeOrderFromIndex(state, a.id);
    assert.equal(state.entries.length, 1);
    assert.equal(state.entries[0]!.id, b.id);
  });

  it("filters by status and q", () => {
    const entries = stateFromOrderEntries([
      orderToIndexEntry(
        makeOrder({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          status: "confirmado",
        }),
      ),
      orderToIndexEntry(
        makeOrder({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          status: "cancelado",
          itens: [
            {
              produtoId: "11111111-1111-4111-8111-111111111111",
              varianteId: "22222222-2222-4222-8222-222222222222",
              nomeProduto: "Calça Jeans",
              tamanho: "42",
              cor: "Azul",
              quantidade: 1,
              precoUnitario: 120,
            },
          ],
        }),
      ),
    ]).entries;

    assert.equal(
      filterOrderIndexEntries(entries, { status: "cancelado" }).length,
      1,
    );
    assert.equal(
      filterOrderIndexEntries(entries, { q: "jeans" }).length,
      1,
    );
  });

  it("shards when above threshold", () => {
    const entries = Array.from({ length: ORDER_INDEX_SHARD_THRESHOLD + 1 }, (_, i) =>
      orderToIndexEntry(
        makeOrder({
          id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
          criadoEm: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
        }),
      ),
    );
    const state = stateFromOrderEntries(entries);
    const writes = serializeOrderIndexWrites(state);
    assert.ok(writes.some((w) => w.path.includes("pedidos/page-")));
    assert.ok(writes.some((w) => w.path === "indices/pedidos.json"));
  });
});
