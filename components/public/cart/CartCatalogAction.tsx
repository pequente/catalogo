"use client";

import Link from "next/link";
import { useCartOptional } from "@/components/public/cart/CartProvider";
import type { ProductListItem } from "@/src/schemas/product-list";

export function CartCatalogAction({
  product,
  cartEnabled,
}: {
  product: ProductListItem;
  cartEnabled?: boolean;
}) {
  const cart = useCartOptional();
  const hasVariants = product.variantesCount > 0;
  const canQuickAdd =
    cartEnabled &&
    cart?.enabled &&
    !hasVariants &&
    product.status !== "esgotado";

  if (!cartEnabled || !cart?.enabled) return null;

  if (canQuickAdd) {
    return (
      <button
        type="button"
        className="card-product__cart-btn"
        aria-label={`Adicionar ${product.nome} ao carrinho`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cart.addLine({
            productId: product.id,
            variantId: null,
            slug: product.slug,
            nome: product.nome,
            quantidade: 1,
            thumbPath: product.capa?.path,
          });
        }}
      >
        +
      </button>
    );
  }

  return (
    <Link
      href={`/produto/${product.slug}`}
      className="card-product__cart-btn card-product__cart-btn--link"
      aria-label={
        hasVariants
          ? `Escolher opções de ${product.nome}`
          : `Ver ${product.nome}`
      }
      onClick={(e) => e.stopPropagation()}
    >
      +
    </Link>
  );
}
