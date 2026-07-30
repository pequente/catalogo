import Link from "next/link";
import {
  getCachedActiveCategories,
  getCachedAllCategories,
  getCachedSiteConfig,
  getCachedPublicCatalogFacets,
  listCachedProductListItems,
} from "@/src/lib/cache/storefront-reads";
import { buildCatalogHref } from "@/src/lib/cache/storefront-isr";
import {
  buildCategoryTree,
  flattenCategoryTree,
  getFilterCategoryIds,
} from "@/src/lib/categories-tree";
import { ProductCard } from "@/components/public/ProductCard";
import { CatalogFilters } from "@/components/public/CatalogFilters";
import { catalogoContagemLabel } from "@/src/lib/front/store-copy";
import { PaginationNav } from "@/components/ui/PaginationNav";
import {
  buildPageSizeSelectOptions,
  PAGE_SIZE_OPTIONS_PUBLIC,
  PAGINATION,
} from "@/src/lib/pagination";

export type CatalogViewQuery = {
  page: number;
  pageSize: number;
  q?: string;
  categoria?: string;
  tamanho?: string;
  cor?: string;
};

/**
 * Shared catalog UI — loaders read the product index (O(1)/O(page)), never N entities.
 * Facets ship as a compact integer index (not N product DTOs) for RSC size.
 * Callers choose ISR-friendly paths vs filtered `/catalogo/busca`.
 */
export async function CatalogPageView({ query }: { query: CatalogViewQuery }) {
  const { page, pageSize, q, categoria, tamanho, cor } = query;

  const [categories, allCategories, facets, site] = await Promise.all([
    getCachedActiveCategories(),
    getCachedAllCategories(),
    getCachedPublicCatalogFacets({ q }),
    getCachedSiteConfig(),
  ]);

  let filterIds: string[] | null = null;
  if (categoria) {
    const match = categories.find(
      (c) => c.slug === categoria || c.id === categoria,
    );
    if (match) {
      filterIds = getFilterCategoryIds(match.id, allCategories);
    } else {
      filterIds = [];
    }
  }

  const result = await listCachedProductListItems({
    publicOnly: true,
    categoriaIds: filterIds ?? undefined,
    tamanho,
    cor,
    q,
    page,
    pageSize,
  });

  const hasFilters = Boolean(q || categoria || tamanho || cor);

  const categoryOptions = flattenCategoryTree(
    buildCategoryTree(categories),
  ).map(({ category: c, depth }) => ({
    id: c.id,
    slug: c.slug,
    nome: c.nome,
    depth,
    parentId: c.parentId,
  }));

  const paginas = site.textos.paginas;
  const catalogo = site.textos.catalogo;
  const produtoCopy = site.textos.produto;

  const filterBase = {
    pageSize,
    q,
    categoria,
    tamanho,
    cor,
    defaultPageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
  };

  return (
    <div className="container catalog-page">
      <header className="catalog-page__head">
        <h1 className="vn-section-title catalog-page__title">
          {paginas.catalogoTitulo}
        </h1>
        <p className="catalog-page__count" aria-live="polite">
          {catalogoContagemLabel(site, result.total)}
        </p>
      </header>

      <CatalogFilters
        categories={categoryOptions}
        facets={facets}
        allCategories={allCategories.map((c) => ({
          id: c.id,
          parentId: c.parentId,
          ativo: c.ativo,
        }))}
        q={q}
        categoria={categoria}
        tamanho={tamanho}
        cor={cor}
        labelCategoria={site.textos.catalogo.labelCategoria}
        buscaPlaceholder={site.textos.catalogo.buscaPlaceholder}
        dimensoes={site.rotulos.dimensoes}
      />

      {result.total === 0 ? (
        <div className="catalog-page__empty">
          <p>{catalogo.empty}</p>
          {hasFilters ? (
            <Link className="btn btn-primary" href="/catalogo">
              {catalogo.limparFiltros}
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid-products">
            {result.items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                cartEnabled={site.mostrarCarrinho}
                copy={produtoCopy}
              />
            ))}
          </div>
          <PaginationNav
            page={result.page}
            pageSize={result.pageSize}
            total={result.total}
            label={paginas.catalogoTitulo}
            className="catalog-page__pagination"
            hrefForPage={(p) => buildCatalogHref({ ...filterBase, page: p })}
            pageSizeOptions={buildPageSizeSelectOptions(
              PAGE_SIZE_OPTIONS_PUBLIC,
              result.pageSize,
              (size) =>
                buildCatalogHref({
                  ...filterBase,
                  page: 1,
                  pageSize: size,
                }),
            )}
          />
        </>
      )}
    </div>
  );
}
