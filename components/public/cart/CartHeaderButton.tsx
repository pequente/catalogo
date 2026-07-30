"use client";

import Link from "next/link";
import { CartIcon } from "@/components/public/icons/StorefrontIcons";
import { useCartOptional } from "@/components/public/cart/CartProvider";
import type { SiteLayoutId } from "@/src/schemas/site-config";

type ClassNames = {
  root?: string;
  link?: string;
  badge?: string;
};

export function CartHeaderButton({
  visible,
  variant,
  classNames = {},
}: {
  visible: boolean;
  variant: SiteLayoutId;
  classNames?: ClassNames;
}) {
  const cart = useCartOptional();
  if (!visible || !cart?.enabled) return null;

  const count = cart.unitCount;
  const label =
    count > 0 ? `Carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Carrinho";

  return (
    <div
      className={classNames.root ?? "header-cart"}
      data-variant={variant}
    >
      <Link
        href="/carrinho"
        className={classNames.link ?? "header-cart__link"}
        aria-label={label}
      >
        <CartIcon />
        {count > 0 ? (
          <span className={classNames.badge ?? "header-cart__badge"}>
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </Link>
    </div>
  );
}
