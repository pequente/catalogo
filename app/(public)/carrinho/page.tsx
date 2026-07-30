import { notFound } from "next/navigation";
import { CartPageClient } from "@/components/public/cart/CartPageClient";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
export const metadata = { title: "Carrinho" };
/** Shell is ISR; cart lines resolve client-side from localStorage. */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export default async function CarrinhoPage() {
  const site = await getCachedSiteConfig();
  if (!site.mostrarCarrinho) {
    notFound();
  }
  // Products resolved client-side by cart line IDs (GET /api/v1/products/by-ids).
  return <CartPageClient site={site} />;
}
