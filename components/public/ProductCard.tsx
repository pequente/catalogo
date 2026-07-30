import Image from "next/image";
import Link from "next/link";
import { formatBrl, mediaUrl } from "@/src/lib/front/format";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import { discountPercent } from "@/src/lib/front/pricing";
import {
  listItemCompareAt,
  listItemSell,
  type ProductListItem,
} from "@/src/schemas/product-list";
import type { SiteTextosExtended } from "@/src/schemas/site-personalization";
import { DEFAULT_SITE_TEXTOS_PRODUTO } from "@/src/config/store-copy-defaults";
import { CartCatalogAction } from "@/components/public/cart/CartCatalogAction";

export function ProductCard({
  product,
  cartEnabled,
  copy = DEFAULT_SITE_TEXTOS_PRODUTO,
}: {
  product: ProductListItem;
  cartEnabled?: boolean;
  copy?: SiteTextosExtended["produto"];
}) {
  const img = mediaUrl(product.capa?.path);
  const sell = listItemSell(product);
  const compareAt = listItemCompareAt(product);
  const pct = discountPercent(sell, compareAt);

  return (
    <article className="card-product">
      <div className="card-product__media-wrap">
        <Link href={`/produto/${product.slug}`} className="card-product__media">
          {img ? (
            <Image
              src={img}
              alt={product.capa?.alt || product.nome}
              fill
              sizes={IMAGE_SIZES.card}
              className="card-product__img"
            />
          ) : (
            <span className="product-gallery__placeholder">{product.nome}</span>
          )}
          {product.lancamento ? (
            <span className="badge card-product__badge card-product__badge--new">
              {copy.badgeNovo}
            </span>
          ) : null}
          {pct != null ? (
            <span className="badge card-product__badge card-product__badge--sale">
              -{pct}%
            </span>
          ) : null}
          {product.status === "esgotado" ? (
            <span className="badge badge-dark card-product__badge card-product__badge--sold">
              {copy.badgeEsgotado}
            </span>
          ) : null}
        </Link>
        <CartCatalogAction product={product} cartEnabled={cartEnabled} />
      </div>
      <div className="card-product__body">
        <Link href={`/produto/${product.slug}`} className="card-product__name">
          <strong>{product.nome}</strong>
        </Link>
        <div className="price card-product__price">
          {product.mostrarAPartirDe ? (
            <>
              <span className="card-product__price-from">{copy.aPartirDe}</span>
              {formatBrl(sell)}
            </>
          ) : compareAt != null ? (
            <>
              <span className="card-product__price-old">
                {formatBrl(compareAt)}
              </span>
              {formatBrl(sell)}
            </>
          ) : (
            formatBrl(sell)
          )}
        </div>
      </div>
    </article>
  );
}
