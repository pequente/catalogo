import { CatalogPageView } from "@/components/public/CatalogPageView";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { seoTitleFromTemplate } from "@/src/lib/front/store-copy";
import {
  firstSearchParam,
  normalizePagination,
  PAGINATION,
} from "@/src/lib/pagination";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Filtered / search catalog. Uses searchParams → dynamic render in Next 15,
 * but loaders hit the product index (cheap miss). Prefer `/catalogo` +
 * `/catalogo/page/N` for unfiltered browse (ISR).
 */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export async function generateMetadata() {
  const site = await getCachedSiteConfig();
  return {
    title: seoTitleFromTemplate(site, site.textos.paginas.catalogoTitulo),
  };
}

export default async function CatalogoBuscaPage({ searchParams }: Props) {
  const sp = await searchParams;
  const categoria = firstSearchParam(sp.categoria);
  const tamanho = firstSearchParam(sp.tamanho);
  const cor = firstSearchParam(sp.cor);
  const q = firstSearchParam(sp.q);
  const { page, pageSize } = normalizePagination(
    {
      page: firstSearchParam(sp.page),
      pageSize: firstSearchParam(sp.pageSize),
    },
    { defaultPageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE },
  );

  return (
    <CatalogPageView
      query={{ page, pageSize, q, categoria, tamanho, cor }}
    />
  );
}
