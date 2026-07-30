import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Client } from "@/src/schemas/client";
import {
  clientDisplayDate,
  filterAndSortClients,
  matchesClientQuery,
  resolvePeriodBounds,
} from "./client-filter.ts";

const base: Client = {
  id: "11111111-1111-4111-8111-111111111111",
  versao: 1,
  nome: "Tiago Silva",
  email: "tiago@example.com",
  celular: "16991816877",
  criadoEm: "2024-07-17T20:08:00.000Z",
  atualizadoEm: "2024-07-18T10:00:00.000Z",
};

const other: Client = {
  ...base,
  id: "22222222-2222-4222-8222-222222222222",
  nome: "Ana",
  email: undefined,
  celular: "11999998888",
  criadoEm: "2024-06-01T12:00:00.000Z",
  atualizadoEm: "2024-06-02T12:00:00.000Z",
};

describe("matchesClientQuery", () => {
  it("matches nome", () => {
    assert.equal(matchesClientQuery(base, "tiago"), true);
  });

  it("matches email", () => {
    assert.equal(matchesClientQuery(base, "example.com"), true);
  });

  it("matches celular digits", () => {
    assert.equal(matchesClientQuery(base, "99181"), true);
  });

  it("empty query matches all", () => {
    assert.equal(matchesClientQuery(base, "  "), true);
  });

  it("matches nome ignoring accents", () => {
    const joao: Client = {
      ...base,
      nome: "João Pedro Borges Araújo",
    };
    assert.equal(matchesClientQuery(joao, "Joao"), true);
    assert.equal(matchesClientQuery(joao, "joao pedro"), true);
    assert.equal(matchesClientQuery(joao, "Araujo"), true);
    assert.equal(matchesClientQuery(joao, "João"), true);
  });
});

describe("resolvePeriodBounds", () => {
  const now = new Date(2024, 6, 17, 15, 30, 0);

  it("returns null for all", () => {
    assert.equal(resolvePeriodBounds("all", "", "", now), null);
  });

  it("today spans local day", () => {
    const b = resolvePeriodBounds("today", "", "", now);
    assert.ok(b);
    assert.equal(b!.startIso, new Date(2024, 6, 17, 0, 0, 0, 0).toISOString());
    assert.equal(
      b!.endIso,
      new Date(2024, 6, 17, 23, 59, 59, 999).toISOString(),
    );
  });

  it("custom range inclusive", () => {
    const b = resolvePeriodBounds("custom", "2024-07-01", "2024-07-17", now);
    assert.ok(b);
    assert.equal(b!.startIso, new Date(2024, 6, 1, 0, 0, 0, 0).toISOString());
  });
});

describe("clientDisplayDate", () => {
  it("uses criadoEm for cadastro and name sorts", () => {
    const d = clientDisplayDate(base, "created");
    assert.equal(d.iso, base.criadoEm);
    assert.equal(d.label, "Cadastro");
    assert.equal(clientDisplayDate(base, "name").iso, base.criadoEm);
  });

  it("uses atualizadoEm for updated sort", () => {
    const d = clientDisplayDate(base, "updated");
    assert.equal(d.iso, base.atualizadoEm);
    assert.equal(d.label, "Atualizado");
  });
});

describe("filterAndSortClients", () => {
  const orderIds = new Set([base.id]);
  const now = new Date(2024, 6, 17, 15, 30, 0);

  it("filters by order", () => {
    const withOrder = filterAndSortClients(
      [base, other],
      {
        query: "",
        periodPreset: "all",
        customFrom: "",
        customTo: "",
        contactFilter: "all",
        orderFilter: "with_order",
        sort: "created",
      },
      orderIds,
      now,
    );
    assert.equal(withOrder.length, 1);
    assert.equal(withOrder[0].id, base.id);
  });

  it("sorts by name", () => {
    const sorted = filterAndSortClients(
      [base, other],
      {
        query: "",
        periodPreset: "all",
        customFrom: "",
        customTo: "",
        contactFilter: "all",
        orderFilter: "all",
        sort: "name",
      },
      orderIds,
      now,
    );
    assert.equal(sorted[0].nome, "Ana");
  });

  it("filters contact whatsapp only", () => {
    const list = filterAndSortClients(
      [base, other],
      {
        query: "",
        periodPreset: "all",
        customFrom: "",
        customTo: "",
        contactFilter: "email",
        orderFilter: "all",
        sort: "created",
      },
      orderIds,
      now,
    );
    assert.equal(list.length, 1);
    assert.equal(list[0].id, base.id);
  });
});
