import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompactCatalogFacets,
  countCompactFacetMatches,
} from "./catalog-facets";

describe("catalog-facets compact index", () => {
  const products = [
    {
      categoriasIds: ["cat-a", "cat-b"],
      tamanhos: ["M", "G"],
      cores: ["Preto"],
    },
    {
      categoriasIds: ["cat-a"],
      tamanhos: ["P"],
      cores: ["Branco"],
    },
    {
      categoriasIds: ["cat-c"],
      tamanhos: ["M"],
      cores: ["Preto", "Vermelho"],
    },
  ];

  it("dedupes facet labels and packs integer rows", () => {
    const facets = buildCompactCatalogFacets(products);
    assert.deepEqual(facets.tamanhos, ["G", "M", "P"]);
    assert.deepEqual(facets.cores, ["Branco", "Preto", "Vermelho"]);
    assert.equal(facets.rows.length, 3);
    assert.ok(facets.categoryIds.includes("cat-a"));
    assert.equal(typeof facets.rows[0]!.c[0], "number");
  });

  it("counts matches without shipping full product DTOs", () => {
    const facets = buildCompactCatalogFacets(products);
    assert.equal(countCompactFacetMatches(facets, {}), 3);
    assert.equal(
      countCompactFacetMatches(facets, { tamanho: "M" }),
      2,
    );
    assert.equal(
      countCompactFacetMatches(facets, { cor: "preto" }),
      2,
    );
    assert.equal(
      countCompactFacetMatches(facets, {
        categoryIdSet: new Set(["cat-a"]),
        tamanho: "M",
      }),
      1,
    );
  });
});
