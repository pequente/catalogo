/**
 * Storefront ISR / Full Route Cache knobs (Next.js on Vercel).
 *
 * Keep HTML revalidate aligned with Data Cache (`unstable_cache` in
 * storefront-reads) so time-based freshness stays coherent. On-demand
 * `revalidateStorefront` is the primary freshness path after admin writes.
 *
 * Note: route segment `export const revalidate` must be a numeric literal
 * (Next static analysis) — use `120` on pages and keep this constant in sync.
 */
export const STOREFRONT_REVALIDATE_SECONDS = 120;

/** How many unfiltered catalog pages to pre-render at build (`/catalogo/page/N`). */
export const CATALOG_STATIC_PAGE_LIMIT = 50;

export type CatalogFilterValues = {
  q?: string;
  categoria?: string;
  tamanho?: string;
  cor?: string;
  pageSize?: number;
};

export type CatalogHrefOpts = CatalogFilterValues & {
  page?: number;
  /** Default page size used to omit `pageSize` from the URL when unchanged. */
  defaultPageSize: number;
};

function hasActiveFilters(opts: CatalogFilterValues): boolean {
  return Boolean(
    opts.q?.trim() || opts.categoria || opts.tamanho || opts.cor,
  );
}

/**
 * Stable, CDN-friendly catalog URLs:
 * - unfiltered browse (default pageSize) → `/catalogo` / `/catalogo/page/N` (ISR)
 * - filters / search / custom pageSize → `/catalogo/busca?…` (dynamic OK; index-backed)
 */
export function buildCatalogHref(opts: CatalogHrefOpts): string {
  const page = opts.page && opts.page > 1 ? opts.page : 1;
  const customPageSize = Boolean(
    opts.pageSize && opts.pageSize !== opts.defaultPageSize,
  );
  const useBusca = hasActiveFilters(opts) || customPageSize;

  const params = new URLSearchParams();
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  if (opts.categoria) params.set("categoria", opts.categoria);
  if (opts.tamanho) params.set("tamanho", opts.tamanho);
  if (opts.cor) params.set("cor", opts.cor);
  if (customPageSize && opts.pageSize) {
    params.set("pageSize", String(opts.pageSize));
  }

  if (useBusca) {
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `/catalogo/busca?${qs}` : "/catalogo/busca";
  }

  if (page <= 1) return "/catalogo";
  return `/catalogo/page/${page}`;
}

/** True when the request should live under `/catalogo/busca` (has filters). */
export function catalogSearchHasFilters(
  sp: URLSearchParams | Record<string, string | string[] | undefined>,
): boolean {
  const get = (key: string): string | undefined => {
    if (sp instanceof URLSearchParams) {
      return sp.get(key) ?? undefined;
    }
    const v = sp[key];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  return Boolean(
    get("q")?.trim() || get("categoria") || get("tamanho") || get("cor"),
  );
}

export function parseCatalogPageParam(
  raw: string | undefined,
): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}
