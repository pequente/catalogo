import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPageNumberItems,
  buildPageSizeSelectOptions,
  normalizePagination,
  paginateItems,
  PAGINATION,
  parseOptionalBooleanParam,
  totalPages,
} from "./pagination";

describe("normalizePagination", () => {
  it("applies public defaults", () => {
    assert.deepEqual(normalizePagination({}), {
      page: 1,
      pageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
    });
  });

  it("clamps pageSize to max", () => {
    const result = normalizePagination(
      { page: "2", pageSize: "999" },
      { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
    );
    assert.equal(result.page, 2);
    assert.equal(result.pageSize, PAGINATION.MAX_PAGE_SIZE);
  });

  it("rejects invalid page", () => {
    assert.equal(normalizePagination({ page: "0" }).page, 1);
    assert.equal(normalizePagination({ page: "abc" }).page, 1);
  });
});

describe("parseOptionalBooleanParam", () => {
  it("parses truthy and falsy flags", () => {
    assert.equal(parseOptionalBooleanParam("1"), true);
    assert.equal(parseOptionalBooleanParam("true"), true);
    assert.equal(parseOptionalBooleanParam("0"), false);
    assert.equal(parseOptionalBooleanParam("false"), false);
  });

  it("returns undefined for empty or unknown", () => {
    assert.equal(parseOptionalBooleanParam(""), undefined);
    assert.equal(parseOptionalBooleanParam(null), undefined);
    assert.equal(parseOptionalBooleanParam("maybe"), undefined);
  });
});

describe("paginateItems", () => {
  it("slices and reports totals", () => {
    const items = Array.from({ length: 45 }, (_, i) => i + 1);
    const page = paginateItems(items, { page: 2, pageSize: 20 });
    assert.deepEqual(page.items, Array.from({ length: 20 }, (_, i) => i + 21));
    assert.equal(page.total, 45);
    assert.equal(page.page, 2);
    assert.equal(page.pageSize, 20);
  });

  it("clamps page past the end", () => {
    const page = paginateItems([1, 2, 3], { page: 99, pageSize: 20 });
    assert.deepEqual(page.items, [1, 2, 3]);
    assert.equal(page.page, 1);
  });
});

describe("totalPages", () => {
  it("handles empty", () => {
    assert.equal(totalPages(0, 20), 1);
  });

  it("rounds up", () => {
    assert.equal(totalPages(21, 20), 2);
  });
});

describe("buildPageNumberItems", () => {
  it("lists all pages when few", () => {
    assert.deepEqual(buildPageNumberItems(2, 5), [
      { type: "page", page: 1 },
      { type: "page", page: 2 },
      { type: "page", page: 3 },
      { type: "page", page: 4 },
      { type: "page", page: 5 },
    ]);
  });

  it("inserts ellipses for long ranges", () => {
    assert.deepEqual(buildPageNumberItems(5, 40), [
      { type: "page", page: 1 },
      { type: "ellipsis", id: "e-1-4" },
      { type: "page", page: 4 },
      { type: "page", page: 5 },
      { type: "page", page: 6 },
      { type: "ellipsis", id: "e-6-40" },
      { type: "page", page: 40 },
    ]);
  });

  it("fills a single-page gap instead of ellipsis", () => {
    assert.deepEqual(buildPageNumberItems(3, 40), [
      { type: "page", page: 1 },
      { type: "page", page: 2 },
      { type: "page", page: 3 },
      { type: "page", page: 4 },
      { type: "ellipsis", id: "e-4-40" },
      { type: "page", page: 40 },
    ]);
  });
});

describe("buildPageSizeSelectOptions", () => {
  it("sorts sizes and includes current when missing", () => {
    const opts = buildPageSizeSelectOptions([20, 10, 50], 15, (n) => `?s=${n}`);
    assert.deepEqual(opts, [
      { value: 10, href: "?s=10" },
      { value: 15, href: "?s=15" },
      { value: 20, href: "?s=20" },
      { value: 50, href: "?s=50" },
    ]);
  });
});
