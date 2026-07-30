import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyProductIndexState,
  productToIndexEntry,
} from "@/src/schemas/product-index";
import type { Product } from "@/src/schemas/product";
import {
  removeProductFromIndex,
  upsertProductInIndex,
} from "@/src/lib/indices/product-index-core";
import {
  assertProductsMatchIndexState,
  diffIndexEntryAgainstProduct,
} from "@/src/lib/indices/product-index-entry-match";

function makeProduct(
  overrides: Partial<Product> & Pick<Product, "id" | "slug">,
): Product {
  const now = "2026-07-21T12:00:00.000Z";
  return {
    id: overrides.id,
    versao: overrides.versao ?? 1,
    nome: overrides.nome ?? "Camiseta",
    slug: overrides.slug,
    descricao: overrides.descricao ?? "texto longo que não vai ao índice",
    referencia: overrides.referencia ?? "REF-1",
    preco: overrides.preco ?? 100,
    precoPromocional: overrides.precoPromocional ?? null,
    categoriasIds: overrides.categoriasIds ?? [
      "11111111-1111-4111-8111-111111111111",
    ],
    status: overrides.status ?? "ativo",
    destaque: overrides.destaque ?? false,
    lancamento: overrides.lancamento ?? false,
    imagens: overrides.imagens ?? [],
    variantes: overrides.variantes ?? [
      {
        id: "22222222-2222-4222-8222-222222222222",
        atributos: { tamanho: "M", cor: "Preto" },
        estoque: 3,
        sku: undefined,
        preco: null,
      },
    ],
    criadoEm: overrides.criadoEm ?? now,
    atualizadoEm: overrides.atualizadoEm ?? now,
  };
}

describe("product-index CRUD consistency (Fase 5)", () => {
  it("create/update/delete keep index entry equal to entity projection", () => {
    let state = emptyProductIndexState();

    const created = makeProduct({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      slug: "camiseta-preta",
      referencia: "CP-01",
    });
    state = upsertProductInIndex(state, created);
    assert.deepEqual(
      assertProductsMatchIndexState(state, [created]),
      [],
      "after create",
    );
    assert.deepEqual(
      state.entries.find((e) => e.id === created.id),
      productToIndexEntry(created),
    );

    const updated: Product = {
      ...created,
      versao: 2,
      nome: "Camiseta Preta GG",
      preco: 149.9,
      precoPromocional: 129.9,
      destaque: true,
      variantes: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          atributos: { tamanho: "GG", cor: "Preto" },
          estoque: 8,
          sku: undefined,
          preco: null,
        },
      ],
      atualizadoEm: "2026-07-21T15:00:00.000Z",
    };
    state = upsertProductInIndex(state, updated);
    assert.deepEqual(
      assertProductsMatchIndexState(state, [updated]),
      [],
      "after update",
    );
    const entry = state.entries.find((e) => e.id === updated.id)!;
    assert.equal(diffIndexEntryAgainstProduct(entry, updated).length, 0);
    assert.equal(entry.estoqueTotal, 8);
    assert.deepEqual(entry.tamanhos, ["GG"]);

    state = removeProductFromIndex(state, updated.id);
    assert.deepEqual(
      assertProductsMatchIndexState(state, [], [updated.id]),
      [],
      "after delete",
    );
    assert.equal(state.entries.length, 0);
    assert.equal(state.bySlug[updated.slug], undefined);
  });

  it("detects stale index fields after entity drift", () => {
    const product = makeProduct({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      slug: "drift",
      preco: 10,
    });
    let state = upsertProductInIndex(emptyProductIndexState(), product);
    const stale = {
      ...state.entries[0]!,
      preco: 99,
      nome: "stale",
    };
    state = {
      ...state,
      entries: [stale],
    };
    const issues = assertProductsMatchIndexState(state, [product]);
    assert.ok(issues.some((i) => i.kind === "entry_mismatch"));
    const mismatch = issues.find((i) => i.kind === "entry_mismatch");
    assert.ok(mismatch && mismatch.kind === "entry_mismatch");
    assert.ok(mismatch.fields.includes("preco"));
    assert.ok(mismatch.fields.includes("nome"));
  });
});
