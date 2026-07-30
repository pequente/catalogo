import { notFound } from "next/navigation";
import { CatalogPageView } from "@/components/public/CatalogPageView";
import {
  CATALOG_STATIC_PAGE_LIMIT,
  parseCatalogPageParam,
} from "@/src/lib/cache/storefront-isr";
import {
  getCachedProductIndex,
  getCachedSiteConfig,
} from "@/src/lib/cache/storefront-reads";
import { filterProductIndexEntries } from "@/src/lib/indices/product-index-core";
import { seoTitleFromTemplate } from "@/src/lib/front/store-copy";
import { PAGINATION, totalPages } from "@/src/lib/pagination";

type Props = {
  params: Promise<{ page: string }>;
};

/** Paginated unfiltered browse — ISR + CDN. */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS
export const dynamicParams = true;

export async function generateMetadata() {
  const site = await getCachedSiteConfig();
  return {
    title: seoTitleFromTemplate(site, site.textos.paginas.catalogoTitulo),
  };
}

export async function generateStaticParams() {
  const index = await getCachedProductIndex();
  const publicCount = filterProductIndexEntries(index.entries, {
    publicOnly: true,
  }).length;
  const pages = totalPages(
    publicCount,
    PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
  );
  const last = Math.min(pages, CATALOG_STATIC_PAGE_LIMIT);
  // Page 1 lives at `/catalogo`; prebuild 2…last.
  const out: Array<{ page: string }> = [];
  for (let p = 2; p <= last; p++) {
    out.push({ page: String(p) });
  }
  return out;
}

export default async function CatalogoPagedPage({ params }: Props) {
  const { page: raw } = await params;
  const page = parseCatalogPageParam(raw);
  if (page == null || page < 2) notFound();

  const index = await getCachedProductIndex();
  const publicCount = filterProductIndexEntries(index.entries, {
    publicOnly: true,
  }).length;
  const pages = totalPages(
    publicCount,
    PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
  );
  if (page > pages) notFound();

  return (
    <CatalogPageView
      query={{
        page,
        pageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
      }}
    />
  );
}
