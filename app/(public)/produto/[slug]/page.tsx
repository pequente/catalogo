import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getCachedProductBySlug,
  getCachedPublicProductSlugs,
  getCachedSiteConfig,
} from "@/src/lib/cache/storefront-reads";
import { getSiteUrl } from "@/src/lib/env";
import { ProductDetailClient } from "@/components/public/ProductDetailClient";
import ProductLoading from "./loading";

type Props = {
  params: Promise<{ slug: string }>;
};

/** New slugs created after deploy still resolve on demand, then enter ISR. */
export const dynamicParams = true;
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export async function generateStaticParams() {
  const products = await getCachedPublicProductSlugs();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const product = await getCachedProductBySlug(slug);
  if (!product) return { title: "Produto" };
  return { title: product.nome, description: product.descricao };
}

/**
 * PDP HTML is statically cached (ISR). Variant query params (`tamanho`,
 * `cor`, `quantidade`) are applied client-side so searchParams do not opt
 * this route into dynamic rendering.
 */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, site] = await Promise.all([
    getCachedProductBySlug(slug),
    getCachedSiteConfig(),
  ]);
  if (!product) notFound();

  return (
    <Suspense fallback={<ProductLoading />}>
      <ProductDetailClient
        product={product}
        productCopy={site.textos.produto}
        dimensoes={site.rotulos.dimensoes}
        whatsappCurto={site.textos.home.whatsappCurto}
        waPhone={site.whatsapp.telefone}
        waProductParts={site.whatsapp.mensagemProdutoParts}
        waIncluirReferencia={Boolean(
          site.whatsapp.mensagemProdutoIncluirReferencia,
        )}
        waProdutoFormatoItens={
          site.whatsapp.mensagemProdutoFormatoItens ?? "produto"
        }
        waProdutoItemCompactoParts={
          site.whatsapp.mensagemProdutoItemCompactoParts
        }
        showWhatsApp={site.whatsapp.mostrar}
        siteUrl={getSiteUrl()}
        mostrarCarrinho={site.mostrarCarrinho}
      />
    </Suspense>
  );
}
