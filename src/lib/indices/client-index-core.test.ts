import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Client } from "@/src/schemas/client";
import {
  emptyClientIndexState,
  clientToIndexEntry,
  CLIENT_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/client-index";
import {
  filterClientIndexEntries,
  removeClientFromIndex,
  serializeClientIndexWrites,
  stateFromClientEntries,
  upsertClientInIndex,
} from "@/src/lib/indices/client-index-core";

function makeClient(
  overrides: Partial<Client> & Pick<Client, "id" | "nome">,
): Client {
  const now = "2026-07-21T12:00:00.000Z";
  return {
    id: overrides.id,
    versao: overrides.versao ?? 1,
    nome: overrides.nome,
    email: overrides.email ?? "a@example.com",
    celular: overrides.celular,
    criadoEm: overrides.criadoEm ?? now,
    atualizadoEm: overrides.atualizadoEm ?? now,
  };
}

describe("client-index-core", () => {
  it("builds entry with path and secondary maps", () => {
    const client = makeClient({
      id: "33333333-3333-4333-8333-333333333333",
      nome: "Ana",
      email: "Ana@Example.com",
      celular: "11999998888",
    });
    const entry = clientToIndexEntry(client);
    assert.equal(entry.path, `clientes/${client.id}.json`);
    assert.equal(entry.email, "Ana@Example.com");

    let state = emptyClientIndexState();
    state = upsertClientInIndex(state, client);
    assert.equal(state.byEmail["ana@example.com"], client.id);
    assert.equal(state.byCelular["11999998888"], client.id);
  });

  it("upserts and removes while rebuilding maps", () => {
    let state = emptyClientIndexState();
    const a = makeClient({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      nome: "A",
      email: "a@test.com",
    });
    const b = makeClient({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      nome: "B",
      email: "b@test.com",
      celular: "11988887777",
    });
    state = upsertClientInIndex(state, a);
    state = upsertClientInIndex(state, b);
    assert.equal(state.entries.length, 2);
    state = removeClientFromIndex(state, a.id);
    assert.equal(state.entries.length, 1);
    assert.equal(state.byEmail["a@test.com"], undefined);
    assert.equal(state.byEmail["b@test.com"], b.id);
  });

  it("filters by q", () => {
    const entries = stateFromClientEntries([
      clientToIndexEntry(
        makeClient({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          nome: "Maria Silva",
          email: "maria@x.com",
        }),
      ),
      clientToIndexEntry(
        makeClient({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          nome: "João",
          email: "joao@x.com",
          celular: "11977776666",
        }),
      ),
    ]).entries;

    assert.equal(filterClientIndexEntries(entries, { q: "maria" }).length, 1);
    assert.equal(filterClientIndexEntries(entries, { q: "1197777" }).length, 1);
  });

  it("shards when above threshold", () => {
    const entries = Array.from(
      { length: CLIENT_INDEX_SHARD_THRESHOLD + 1 },
      (_, i) =>
        clientToIndexEntry(
          makeClient({
            id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
            nome: `C${i}`,
            email: `c${i}@ex.com`,
          }),
        ),
    );
    const state = stateFromClientEntries(entries);
    const writes = serializeClientIndexWrites(state);
    assert.ok(writes.some((w) => w.path.includes("clientes/page-")));
    assert.ok(writes.some((w) => w.path === "indices/clientes-by-email.json"));
  });
});
