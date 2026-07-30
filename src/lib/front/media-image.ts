/** Shared sizes for next/image on the storefront. */

export const IMAGE_SIZES = {
  card: "(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw",
  hero: "100vw",
  heroSplit: "(max-width: 768px) 100vw, 50vw",
  heroCarousel: "100vw",
  gallery: "(max-width: 768px) 100vw, 50vw",
  galleryThumb: "72px",
  bannerFaixa: "100vw",
  bannerPromo: "(max-width: 768px) 100vw, 50vw",
} as const;

export type ImageSizeKey = keyof typeof IMAGE_SIZES;
