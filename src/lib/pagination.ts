/** Shared pagination helpers for list surfaces (Fase 1). */

export const PAGINATION = {
  /** Admin list defaults (produtos, pedidos, clientes). */
  ADMIN_DEFAULT_PAGE_SIZE: 10,
  /** Storefront catalog default. */
  PUBLIC_DEFAULT_PAGE_SIZE: 12,
  /** Hard cap for any pageSize query param. */
  MAX_PAGE_SIZE: 100,
} as const;

/** Page-size choices for admin list surfaces. */
export const PAGE_SIZE_OPTIONS_ADMIN = [10, 25, 50, 100] as const;

/** Page-size choices for the public catalog. */
export const PAGE_SIZE_OPTIONS_PUBLIC = [12, 24, 48] as const;

export type PageNumberItem =
  | { type: "page"; page: number }
  | { type: "ellipsis"; id: string };

export type PageSizeSelectOption = {
  value: number;
  href: string;
};

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type PaginationParams = {
  page: number;
  pageSize: number;
};

/** Normalize page (≥1) and pageSize (1…max), applying defaults. */
export function normalizePagination(
  raw?: { page?: number | string | null; pageSize?: number | string | null },
  opts?: { defaultPageSize?: number; maxPageSize?: number },
): PaginationParams {
  const defaultPageSize =
    opts?.defaultPageSize ?? PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE;
  const maxPageSize = opts?.maxPageSize ?? PAGINATION.MAX_PAGE_SIZE;

  const pageNum = Number(raw?.page);
  const sizeNum = Number(raw?.pageSize);

  const page =
    Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : 1;
  const pageSize = Number.isFinite(sizeNum)
    ? Math.min(maxPageSize, Math.max(1, Math.floor(sizeNum)))
    : defaultPageSize;

  return { page, pageSize };
}

/**
 * Slice an already-filtered in-memory array into a page.
 * Prefer filtering a lean index (Fase 2) then slicing — never N entity files.
 */
export function paginateItems<T>(
  items: readonly T[],
  params: PaginationParams,
): PaginatedResult<T> {
  const total = items.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / params.pageSize);
  const page = Math.min(params.page, totalPages);
  const start = (page - 1) * params.pageSize;
  return {
    items: items.slice(start, start + params.pageSize),
    total,
    page,
    pageSize: params.pageSize,
  };
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 1;
  return Math.ceil(total / pageSize);
}

/**
 * Build a compact page-number window with ellipses.
 * Shows first/last boundaries and ±1 sibling around the current page.
 * A single-page gap is filled instead of an ellipsis.
 */
export function buildPageNumberItems(
  current: number,
  pages: number,
): PageNumberItem[] {
  if (pages <= 0) return [];
  const safeCurrent = Math.min(Math.max(1, current), pages);
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, i) => ({
      type: "page" as const,
      page: i + 1,
    }));
  }

  const siblings = 1;
  const visible = new Set<number>([1, pages]);
  for (let p = safeCurrent - siblings; p <= safeCurrent + siblings; p++) {
    if (p >= 1 && p <= pages) visible.add(p);
  }

  const sorted = [...visible].sort((a, b) => a - b);
  const items: PageNumberItem[] = [];
  let prev = 0;
  for (const page of sorted) {
    if (prev > 0 && page - prev > 1) {
      if (page - prev === 2) {
        items.push({ type: "page", page: prev + 1 });
      } else {
        items.push({ type: "ellipsis", id: `e-${prev}-${page}` });
      }
    }
    items.push({ type: "page", page });
    prev = page;
  }
  return items;
}

/**
 * Build serializable page-size select options.
 * Includes `current` when it is not already in `sizes` (custom URL values).
 */
export function buildPageSizeSelectOptions(
  sizes: readonly number[],
  current: number,
  hrefForSize: (size: number) => string,
): PageSizeSelectOption[] {
  const unique = new Set<number>(sizes);
  if (Number.isFinite(current) && current >= 1) unique.add(current);
  return [...unique]
    .sort((a, b) => a - b)
    .map((value) => ({ value, href: hrefForSize(value) }));
}

/** Read a single string searchParam (Next.js may pass string[]). */
export function firstSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

/**
 * Parse optional boolean query flags (`1`/`true`/`yes` → true, `0`/`false`/`no` → false).
 * Empty / unknown → undefined (filter not applied).
 */
export function parseOptionalBooleanParam(
  value: string | string[] | undefined | null,
): boolean | undefined {
  const raw =
    typeof value === "string"
      ? value
      : Array.isArray(value)
        ? value[0]
        : value ?? undefined;
  if (raw == null || raw === "") return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") {
    return true;
  }
  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }
  return undefined;
}
