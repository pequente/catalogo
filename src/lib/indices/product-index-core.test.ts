import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyProductIndexState,
  productToIndexEntry,
  PRODUCT_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/product-index";
import type { Product } from "@/src/schemas/product";
import {
  categoryHasProducts,
  filterProductIndexEntries,
  findReferenciaConflict,
  findSlugConflict,
  removeProductFromIndex,
  serializeProductIndexWrites,
  stateFromEntries,
  upsertProductInIndex,
} from "@/src/lib/indices/product-index-core";

function makeProduct(overrides: Partial<Product> & Pick<Product, "id" | "slug">): Product {
  const now = "2026-07-21T12:00:00.000Z";
  return {
    id: overrides.id,
    versao: 1,
    nome: overrides.nome ?? "Camiseta",
    slug: overrides.slug,
    descricao: "",
    referencia: overrides.referencia ?? "REF-1",
    preco: 100,
    precoPromocional: null,
    categoriasIds: overrides.categoriasIds ?? [
      "11111111-1111-4111-8111-111111111111",
    ],
    status: overrides.status ?? "ativo",
    destaque: overrides.destaque ?? false,
    lancamento: overrides.lancamento ?? false,
    imagens: [],
    variantes: overrides.variantes ?? [
      {
        id: "22222222-2222-4222-8222-222222222222",
        atributos: { tamanho: "M", cor: "Preto" },
        estoque: 3,
        sku: undefined,
        preco: null,
      },
    ],
    criadoEm: now,
    atualizadoEm: overrides.atualizadoEm ?? now,
  };
}

describe("product-index-core", () => {
  it("builds entry aligned with list DTO + path", () => {
    const product = makeProduct({
      id: "33333333-3333-4333-8333-333333333333",
      slug: "camiseta-preta",
    });
    const entry = productToIndexEntry(product);
    assert.equal(entry.id, product.id);
    assert.equal(entry.slug, "camiseta-preta");
    assert.equal(entry.path, `produtos/${product.id}.json`);
    assert.equal(entry.estoqueTotal, 3);
    assert.equal(entry.variantesCount, 1);
    assert.deepEqual(entry.tamanhos, ["M"]);
    assert.deepEqual(entry.cores, ["Preto"]);
  });

  it("upserts and removes while keeping secondary maps consistent", () => {
    let state = emptyProductIndexState();
    const a = makeProduct({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      slug: "a",
      referencia: "RA",
      categoriasIds: ["11111111-1111-4111-8111-111111111111"],
    });
    const b = makeProduct({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      slug: "b",
      referencia: "RB",
      categoriasIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      atualizadoEm: "2026-07-22T12:00:00.000Z",
    });

    state = upsertProductInIndex(state, a);
    state = upsertProductInIndex(state, b);
    assert.equal(state.entries.length, 2);
    assert.equal(state.entries[0]!.slug, "b"); // newest first
    assert.equal(state.bySlug.a, a.id);
    assert.equal(state.bySlug.b, b.id);
    assert.equal(state.byReferencia.ra, a.id);
    assert.ok(categoryHasProducts(state, "11111111-1111-4111-8111-111111111111"));
    assert.ok(categoryHasProducts(state, "22222222-2222-4222-8222-222222222222"));

    state = removeProductFromIndex(state, a.id);
    assert.equal(state.entries.length, 1);
    assert.equal(state.bySlug.a, undefined);
    assert.equal(state.byReferencia.ra, undefined);
    assert.equal(findSlugConflict(state, "b"), b.id);
    assert.equal(findSlugConflict(state, "b", b.id), null);
    assert.ok(findReferenciaConflict(state, "RB"));
    assert.equal(findReferenciaConflict(state, "RB", b.id), null);
  });

  it("filters index entries without needing full Product", () => {
    const entries = stateFromEntries([
      productToIndexEntry(
        makeProduct({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          slug: "ativo",
          status: "ativo",
          destaque: true,
        }),
      ),
      productToIndexEntry(
        makeProduct({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          slug: "oculto",
          status: "oculto",
          referencia: "RX",
        }),
      ),
    ]).entries;

    assert.equal(
      filterProductIndexEntries(entries, { publicOnly: true }).length,
      1,
    );
    assert.equal(
      filterProductIndexEntries(entries, { status: "oculto" })[0]!.slug,
      "oculto",
    );
    assert.equal(
      filterProductIndexEntries(entries, { destaque: true })[0]!.slug,
      "ativo",
    );
    assert.equal(
      filterProductIndexEntries(entries, { q: "oculto" })[0]!.slug,
      "oculto",
    );
    assert.equal(
      filterProductIndexEntries(entries, { tamanho: "M" }).length,
      2,
    );
  });

  it("serializes single manifesto under shard threshold", () => {
    const product = makeProduct({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      slug: "one",
    });
    const state = upsertProductInIndex(emptyProductIndexState(), product);
    const writes = serializeProductIndexWrites(state);
    const paths = writes.map((w) => w.path);
    assert.ok(paths.includes("indices/produtos.json"));
    assert.ok(paths.includes("indices/produtos-by-slug.json"));
    assert.ok(paths.includes("indices/produtos-by-referencia.json"));
    assert.ok(paths.includes("indices/produtos-by-categoria.json"));
    assert.ok(paths.includes("indices/dashboard-catalogo.json"));
    const catalog = writes.find(
      (w) => w.path === "indices/dashboard-catalogo.json",
    )!.data as { produtos: number; ativos: number };
    assert.equal(catalog.produtos, 1);
    assert.equal(catalog.ativos, 1);
    const manifest = writes.find((w) => w.path === "indices/produtos.json")!
      .data as { total: number; sharded?: boolean; entries?: unknown[] };
    assert.equal(manifest.total, 1);
    assert.equal(manifest.sharded, false);
    assert.equal(manifest.entries?.length, 1);
    assert.ok(PRODUCT_INDEX_SHARD_THRESHOLD >= 1500);
  });
});
