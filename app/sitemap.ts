import type { MetadataRoute } from "next";
import { getCachedPublicProductSlugs } from "@/src/lib/cache/storefront-reads";
import { getSiteUrl } from "@/src/lib/env";

/** Sitemap regenerates with the storefront ISR window; on-demand via products tag. */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const products = await getCachedPublicProductSlugs();
  const staticRoutes = ["", "/catalogo", "/sobre"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
  const productRoutes = products.map((p) => ({
    url: `${base}/produto/${p.slug}`,
    lastModified: new Date(p.atualizadoEm),
  }));
  return [...staticRoutes, ...productRoutes];
}
