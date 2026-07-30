import Link from "next/link";
import { PaginationDockShell } from "@/components/ui/PaginationDockShell";
import { PaginationPageSizeSelect } from "@/components/ui/PaginationPageSizeSelect";
import {
  buildPageNumberItems,
  totalPages,
  type PageSizeSelectOption,
} from "@/src/lib/pagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  /** Build href for a 1-based page number (preserve filters). */
  hrefForPage: (page: number) => string;
  /** Serializable page-size options (hrefs already reset to page 1). */
  pageSizeOptions: PageSizeSelectOption[];
  /** Optional aria label prefix, e.g. "Produtos". */
  label?: string;
  className?: string;
};

function DirControl({
  href,
  rel,
  label,
  chevron,
}: {
  href: string | null;
  rel?: "prev" | "next";
  label: string;
  chevron: "‹" | "›";
}) {
  const className = "btn btn-ghost btn-sm pagination-nav__dir";
  const inner = (
    <>
      <span className="pagination-nav__dir-chevron" aria-hidden="true">
        {chevron}
      </span>
      <span className="pagination-nav__dir-label">{label}</span>
    </>
  );

  if (href != null) {
    return (
      <Link className={className} href={href} rel={rel} aria-label={label}>
        {inner}
      </Link>
    );
  }

  return (
    <span className={className} aria-disabled="true" aria-label={label}>
      {inner}
    </span>
  );
}

/**
 * Page numbers + prev/next + page-size select for list surfaces.
 * Links stay shareable; the size select is a small client island.
 * Dock shell floats while scrolling and anchors before footer/content end.
 */
export function PaginationNav({
  page,
  pageSize,
  total,
  hrefForPage,
  pageSizeOptions,
  label = "Resultados",
  className,
}: Props) {
  if (total === 0) return null;

  const pages = totalPages(total, pageSize);
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showPageNav = pages > 1;
  const prev = page > 1 ? page - 1 : null;
  const next = page < pages ? page + 1 : null;
  const pageItems = showPageNav ? buildPageNumberItems(page, pages) : [];

  return (
    <PaginationDockShell>
      <nav
        className={["pagination-nav", "pagination-nav--dock", className]
          .filter(Boolean)
          .join(" ")}
        aria-label={`Paginação — ${label}`}
      >
        <p className="pagination-nav__summary">
          <span className="pagination-nav__summary-range">
            {from}–{to} de {total}
          </span>
          {showPageNav ? (
            <span className="pagination-nav__pages">
              {" "}
              · página {page} de {pages}
            </span>
          ) : null}
          {showPageNav ? (
            <span className="pagination-nav__summary-short" aria-hidden="true">
              {page}/{pages}
            </span>
          ) : null}
        </p>

        {showPageNav ? (
          <div className="pagination-nav__actions">
            <DirControl
              href={prev != null ? hrefForPage(prev) : null}
              rel="prev"
              label="Anterior"
              chevron="‹"
            />

            <div className="pagination-nav__numbers" role="list">
              {pageItems.map((item) =>
                item.type === "ellipsis" ? (
                  <span
                    key={item.id}
                    className="pagination-nav__ellipsis"
                    aria-hidden="true"
                  >
                    …
                  </span>
                ) : item.page === page ? (
                  <span
                    key={item.page}
                    className="pagination-nav__page is-active"
                    aria-current="page"
                    role="listitem"
                  >
                    {item.page}
                  </span>
                ) : (
                  <Link
                    key={item.page}
                    className="pagination-nav__page"
                    href={hrefForPage(item.page)}
                    role="listitem"
                  >
                    {item.page}
                  </Link>
                ),
              )}
            </div>

            <DirControl
              href={next != null ? hrefForPage(next) : null}
              rel="next"
              label="Próxima"
              chevron="›"
            />
          </div>
        ) : null}

        {pageSizeOptions.length > 0 ? (
          <PaginationPageSizeSelect
            value={pageSize}
            options={pageSizeOptions}
          />
        ) : null}
      </nav>
    </PaginationDockShell>
  );
}
