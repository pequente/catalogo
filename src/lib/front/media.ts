import { DEFAULT_BANNER_CTA } from "@/src/config/store-copy-defaults";
import type { Banner } from "@/src/schemas/banner";
import type { Product } from "@/src/schemas/product";

export function bannersByPosicao(
  banners: Banner[],
  posicao: Banner["posicao"],
): Banner[] {
  return banners
    .filter((b) => b.ativo && b.posicao === posicao)
    .sort((a, b) => a.ordem - b.ordem);
}

export function pickBanner(
  banners: Banner[],
  posicao: Banner["posicao"],
): Banner | undefined {
  return bannersByPosicao(banners, posicao)[0];
}

/** Destination used when a banner is clicked; defaults to the catalog. */
export function bannerHref(
  banner: Pick<Banner, "href"> | null | undefined,
  fallback = "/catalogo",
): string {
  const href = banner?.href?.trim();
  return href || fallback;
}

/** CTA label for banners that render a button. */
export function bannerCtaTexto(
  banner: Pick<Banner, "ctaTexto"> | null | undefined,
  fallback = DEFAULT_BANNER_CTA,
): string {
  const label = banner?.ctaTexto?.trim();
  return label || fallback;
}

/** Capa = menor `ordem`; desempate estável pelo path. */
export function sortedProductImages(product: Product) {
  return [...product.imagens].sort((a, b) => a.ordem - b.ordem || a.path.localeCompare(b.path));
}

export function coverImage(product: Product) {
  return sortedProductImages(product)[0];
}
