import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDashboardCatalogFromEntries,
  emptyDashboardCatalogIndex,
} from "@/src/schemas/dashboard-catalog-index";
import {
  productToIndexEntry,
  type ProductIndexEntry,
} from "@/src/schemas/product-index";
import type { Product } from "@/src/schemas/product";

function makeProduct(
  overrides: Partial<Product> & Pick<Product, "id" | "slug" | "status"> & {
    estoque?: number;
  },
): Product {
  const now = "2026-07-21T12:00:00.000Z";
  const estoque = overrides.estoque ?? 2;
  return {
    id: overrides.id,
    versao: 1,
    nome: overrides.nome ?? "Item",
    slug: overrides.slug,
    descricao: "",
    referencia: overrides.referencia ?? "",
    preco: 50,
    precoPromocional: null,
    categoriasIds: overrides.categoriasIds ?? [],
    status: overrides.status,
    destaque: overrides.destaque ?? false,
    lancamento: overrides.lancamento ?? false,
    imagens: [],
    variantes: overrides.variantes ?? [
      {
        id: "22222222-2222-4222-8222-222222222222",
        atributos: { tamanho: "M", cor: "Preto" },
        estoque,
        sku: undefined,
        preco: null,
      },
    ],
    criadoEm: now,
    atualizadoEm: now,
  };
}

describe("dashboard-catalog-index", () => {
  it("returns zeros for empty catalog", () => {
    const empty = emptyDashboardCatalogIndex("2026-07-21T00:00:00.000Z");
    assert.equal(empty.produtos, 0);
    assert.equal(empty.ativos, 0);
    assert.equal(empty.unidadesEstoque, 0);
    assert.equal(empty.produtosEstoqueZero, 0);
  });

  it("aggregates status, stock, destaque and lançamento from index entries", () => {
    const entries: ProductIndexEntry[] = [
      productToIndexEntry(
        makeProduct({
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          slug: "a",
          status: "ativo",
          destaque: true,
          estoque: 5,
        }),
      ),
      productToIndexEntry(
        makeProduct({
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          slug: "b",
          status: "oculto",
          lancamento: true,
          estoque: 0,
        }),
      ),
      productToIndexEntry(
        makeProduct({
          id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          slug: "c",
          status: "esgotado",
          estoque: 0,
        }),
      ),
    ];

    const agg = computeDashboardCatalogFromEntries(
      entries,
      "2026-07-21T12:00:00.000Z",
    );
    assert.equal(agg.produtos, 3);
    assert.equal(agg.ativos, 1);
    assert.equal(agg.ocultos, 1);
    assert.equal(agg.esgotados, 1);
    assert.equal(agg.unidadesEstoque, 5);
    assert.equal(agg.produtosEstoqueZero, 2);
    assert.equal(agg.destaques, 1);
    assert.equal(agg.lancamentos, 1);
    assert.equal(agg.comPromocao, 0);
    assert.equal(agg.semCapa, 3);
    assert.equal(agg.updatedAt, "2026-07-21T12:00:00.000Z");
  });

  it("counts promotional price and missing cover", () => {
    const withPromo = makeProduct({
      id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      slug: "d",
      status: "ativo",
      estoque: 3,
    });
    withPromo.precoPromocional = 39.9;
    withPromo.imagens = [
      {
        id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        path: "produtos/d/capa.webp",
        alt: "Capa",
        ordem: 0,
      },
    ];

    const entries: ProductIndexEntry[] = [
      productToIndexEntry(withPromo),
      productToIndexEntry(
        makeProduct({
          id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
          slug: "f",
          status: "ativo",
          estoque: 1,
        }),
      ),
    ];

    const agg = computeDashboardCatalogFromEntries(entries);
    assert.equal(agg.comPromocao, 1);
    assert.equal(agg.semCapa, 1);
  });
});
