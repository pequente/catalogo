import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  copySurfaceItems,
  resetSurfaceToDefault,
  surfacesItemsDiffer,
} from "./navigation-admin.ts";
import { DEFAULT_NAVEGACAO } from "../schemas/navigation.ts";

function cloneNav<T>(val: T): T {
  return JSON.parse(JSON.stringify(val)) as T;
}

describe("surfacesItemsDiffer", () => {
  it("false when header and drawer match semantically", () => {
    assert.equal(surfacesItemsDiffer(DEFAULT_NAVEGACAO), false);
  });

  it("true when order differs", () => {
    const nav = cloneNav(DEFAULT_NAVEGACAO);
    nav.drawer.itens = [...nav.drawer.itens].reverse();
    assert.equal(surfacesItemsDiffer(nav), true);
  });
});

describe("copySurfaceItems", () => {
  it("clones header items onto drawer with new ids", () => {
    const nav = cloneNav(DEFAULT_NAVEGACAO);
    nav.header.itens = nav.header.itens.slice(0, 1);
    const next = copySurfaceItems(nav, "header", "drawer");
    assert.equal(next.drawer.itens.length, 1);
    assert.notEqual(next.drawer.itens[0]?.id, nav.header.itens[0]?.id);
    assert.equal(next.drawer.itens[0]?.tipo, "link");
    assert.equal(surfacesItemsDiffer(next), false);
  });

  it("can copy search toggle", () => {
    const nav = cloneNav(DEFAULT_NAVEGACAO);
    nav.header.mostrarBusca = true;
    nav.drawer.mostrarBusca = false;
    const next = copySurfaceItems(nav, "header", "drawer", {
      includeSearch: true,
    });
    assert.equal(next.drawer.mostrarBusca, true);
  });
});

describe("resetSurfaceToDefault", () => {
  it("restores header defaults", () => {
    const nav = cloneNav(DEFAULT_NAVEGACAO);
    nav.header.itens = [];
    const next = resetSurfaceToDefault(nav, "header");
    assert.equal(
      next.header.itens.length,
      DEFAULT_NAVEGACAO.header.itens.length,
    );
  });
});
