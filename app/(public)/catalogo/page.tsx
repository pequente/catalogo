import { CatalogPageView } from "@/components/public/CatalogPageView";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { seoTitleFromTemplate } from "@/src/lib/front/store-copy";
import { PAGINATION } from "@/src/lib/pagination";

/** Unfiltered page 1 — Full Route Cache / CDN (ISR). */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export async function generateMetadata() {
  const site = await getCachedSiteConfig();
  return {
    title: seoTitleFromTemplate(site, site.textos.paginas.catalogoTitulo),
  };
}

export default async function CatalogoPage() {
  return (
    <CatalogPageView
      query={{
        page: 1,
        pageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE,
      }}
    />
  );
}
