import Image from "next/image";
import Link from "next/link";
import type { Banner } from "@/src/schemas/banner";
import { mediaUrl } from "@/src/lib/front/format";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import {
  bannerCtaTexto,
  bannerHref,
  pickBanner,
} from "@/src/lib/front/media";

type Props = {
  banners: Banner[];
  storeName: string;
  className?: string;
  promoClassName?: string;
};

export function BannerFaixa({
  banners,
  storeName,
  className,
}: Omit<Props, "promoClassName">) {
  const banner = pickBanner(banners, "faixa");
  const src = mediaUrl(banner?.imagem.path);
  if (!banner || !src) return null;
  const href = bannerHref(banner);

  return (
    <section className={className} aria-label={storeName}>
      <Link href={href} className="banner-faixa__link">
        <Image
          src={src}
          alt={banner.imagem.alt || storeName}
          width={1200}
          height={360}
          sizes={IMAGE_SIZES.bannerFaixa}
          className="banner-faixa__img"
        />
      </Link>
    </section>
  );
}

export function BannerPromo({
  banners,
  storeName,
  className,
}: Omit<Props, "promoClassName">) {
  const banner = pickBanner(banners, "promo");
  const src = mediaUrl(banner?.imagem.path);
  if (!banner || !src) return null;
  const href = bannerHref(banner);
  const ctaLabel = bannerCtaTexto(banner);

  return (
    <section className={className} aria-label={storeName}>
      <div className="banner-promo__media">
        <Image
          src={src}
          alt={banner.imagem.alt || storeName}
          fill
          sizes={IMAGE_SIZES.bannerPromo}
          className="banner-promo__img"
        />
      </div>
      <div className="banner-promo__body">
        <Link className="btn btn-dark" href={href}>
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
