import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCatalogHref,
  catalogSearchHasFilters,
  parseCatalogPageParam,
  STOREFRONT_REVALIDATE_SECONDS,
} from "./storefront-isr";
import { PAGINATION } from "@/src/lib/pagination";

const defaults = {
  defaultPageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
};

describe("STOREFRONT_REVALIDATE_SECONDS", () => {
  it("stays at 120 — pages must use the same numeric literal", () => {
    assert.equal(STOREFRONT_REVALIDATE_SECONDS, 120);
  });
});

describe("buildCatalogHref", () => {
  it("uses ISR paths for unfiltered browse", () => {
    assert.equal(buildCatalogHref({ ...defaults, page: 1 }), "/catalogo");
    assert.equal(
      buildCatalogHref({ ...defaults, page: 2 }),
      "/catalogo/page/2",
    );
  });

  it("routes filters to /catalogo/busca", () => {
    assert.equal(
      buildCatalogHref({ ...defaults, categoria: "vestidos" }),
      "/catalogo/busca?categoria=vestidos",
    );
    assert.equal(
      buildCatalogHref({
        ...defaults,
        q: "camisa",
        page: 3,
        cor: "Preto",
      }),
      "/catalogo/busca?q=camisa&cor=Preto&page=3",
    );
  });

  it("routes custom pageSize to busca so /catalogo stays static", () => {
    assert.equal(
      buildCatalogHref({ ...defaults, pageSize: 48, page: 2 }),
      "/catalogo/busca?pageSize=48&page=2",
    );
  });
});

describe("catalogSearchHasFilters", () => {
  it("detects filter keys", () => {
    assert.equal(
      catalogSearchHasFilters(new URLSearchParams("page=2")),
      false,
    );
    assert.equal(
      catalogSearchHasFilters(new URLSearchParams("q=x")),
      true,
    );
    assert.equal(
      catalogSearchHasFilters({ categoria: "a", page: "1" }),
      true,
    );
  });
});

describe("parseCatalogPageParam", () => {
  it("parses positive integers", () => {
    assert.equal(parseCatalogPageParam("3"), 3);
    assert.equal(parseCatalogPageParam("0"), null);
    assert.equal(parseCatalogPageParam("abc"), null);
  });
});
