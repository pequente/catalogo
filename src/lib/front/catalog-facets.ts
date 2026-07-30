/**
 * Compact catalog facets for client filter sheets.
 * Avoids shipping N product DTOs into RSC props (Fase 3 / Fase 6).
 */

export type CompactCatalogFacets = {
  tamanhos: string[];
  cores: string[];
  /** Deduped category UUID table referenced by `rows[].c`. */
  categoryIds: string[];
  /**
   * One row per public (filtered) product — only integer indexes.
   * `c` → categoryIds, `s` → tamanhos, `k` → cores.
   */
  rows: Array<{ c: number[]; s: number[]; k: number[] }>;
};

export type FacetSourceProduct = {
  categoriasIds: string[];
  tamanhos: string[];
  cores: string[];
};

function sortedUnique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR", { numeric: true }),
  );
}

function indexOfOrPush(table: string[], value: string): number {
  const existing = table.indexOf(value);
  if (existing >= 0) return existing;
  table.push(value);
  return table.length - 1;
}

/** Build a compact facet index from lean product facet rows (index-derived). */
export function buildCompactCatalogFacets(
  products: FacetSourceProduct[],
): CompactCatalogFacets {
  const tamanhos = sortedUnique(products.flatMap((p) => p.tamanhos));
  const cores = sortedUnique(products.flatMap((p) => p.cores));
  const categoryIds: string[] = [];
  const sizeIndex = new Map(tamanhos.map((t, i) => [t, i]));
  const colorIndex = new Map(
    cores.map((c, i) => [c.toLowerCase(), i]),
  );

  const rows: CompactCatalogFacets["rows"] = products.map((p) => ({
    c: p.categoriasIds.map((id) => indexOfOrPush(categoryIds, id)),
    s: p.tamanhos
      .map((t) => sizeIndex.get(t))
      .filter((i): i is number => i !== undefined),
    k: p.cores
      .map((c) => colorIndex.get(c.toLowerCase()))
      .filter((i): i is number => i !== undefined),
  }));

  return { tamanhos, cores, categoryIds, rows };
}

export function countCompactFacetMatches(
  facets: CompactCatalogFacets,
  opts: {
    /** Category ids in the selected subtree (resolved server-side shape). */
    categoryIdSet?: Set<string> | null;
    tamanho?: string;
    cor?: string;
  },
): number {
  const sizeIdx =
    opts.tamanho && opts.tamanho.length > 0
      ? facets.tamanhos.indexOf(opts.tamanho)
      : -1;
  const corNorm = opts.cor?.trim().toLowerCase() ?? "";
  const colorIdx =
    corNorm.length > 0
      ? facets.cores.findIndex((c) => c.toLowerCase() === corNorm)
      : -1;

  let categoryIdxSet: Set<number> | null = null;
  if (opts.categoryIdSet && opts.categoryIdSet.size > 0) {
    categoryIdxSet = new Set<number>();
    facets.categoryIds.forEach((id, idx) => {
      if (opts.categoryIdSet!.has(id)) categoryIdxSet!.add(idx);
    });
  }

  let n = 0;
  for (const row of facets.rows) {
    if (categoryIdxSet && !row.c.some((i) => categoryIdxSet!.has(i))) {
      continue;
    }
    if (sizeIdx >= 0 && !row.s.includes(sizeIdx)) continue;
    if (colorIdx >= 0 && !row.k.includes(colorIdx)) continue;
    n++;
  }
  return n;
}
