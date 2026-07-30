import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { getLayout } from "@/components/public/layouts";

export default async function PublicNotFound() {
  const site = await getCachedSiteConfig();
  const { NotFound } = getLayout(site.layout);
  return <NotFound site={site} />;
}
