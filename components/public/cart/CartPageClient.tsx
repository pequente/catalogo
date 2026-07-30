"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { CartIcon } from "@/components/public/icons/StorefrontIcons";
import { useCart } from "@/components/public/cart/CartProvider";
import { cartLineKey, type CartLine } from "@/src/lib/front/cart";
import { formatBrl, mediaUrl } from "@/src/lib/front/format";
import { coverImage } from "@/src/lib/front/media";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import { variantDisplayPrice } from "@/src/lib/front/pricing";
import { findVariant } from "@/src/lib/front/variants";
import {
  cartWaMessage,
  clampQuantity,
  waLink,
  WA_MESSAGE_URL_WARN_LENGTH,
  waMessageEncodedLength,
} from "@/src/lib/wa";
import type { Product } from "@/src/schemas/product";
import type { SiteConfig } from "@/src/schemas/site-config";

type ResolvedLine = {
  key: string;
  line: CartLine;
  product: Product | null;
  variant: ReturnType<typeof findVariant>;
  issue: "missing" | "stock" | null;
  maxQty: number;
  priceLabel: string;
};

function resolveLine(
  line: CartLine,
  products: Product[],
  loading: boolean,
): ResolvedLine {
  const key = cartLineKey(line);
  const product = products.find((p) => p.id === line.productId) ?? null;
  if (!product) {
    return {
      key,
      line,
      product: null,
      variant: null,
      issue: loading ? null : "missing",
      maxQty: line.quantidade,
      priceLabel: "—",
    };
  }
  const hasVariants = product.variantes.length > 0;
  let variant = null;
  let maxQty = 999;
  if (hasVariants) {
    variant = findVariant(
      product.variantes,
      line.tamanho ?? "",
      line.cor ?? "",
    );
    if (!variant) {
      return {
        key,
        line,
        product,
        variant: null,
        issue: "missing",
        maxQty: 0,
        priceLabel: "—",
      };
    }
    maxQty = variant.estoque;
  } else if (product.status === "esgotado") {
    maxQty = 0;
  }
  const issue = maxQty <= 0 ? "stock" : null;
  const { sell } = variantDisplayPrice(product, variant);
  return {
    key,
    line,
    product,
    variant,
    issue,
    maxQty: Math.max(maxQty, 0),
    priceLabel: formatBrl(sell),
  };
}

export function CartPageClient({ site }: { site: SiteConfig }) {
  const cart = useCart();
  const wa = site.whatsapp;
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const productIdsKey = useMemo(() => {
    const ids = [...new Set(cart.lines.map((l) => l.productId))].sort();
    return ids.join(",");
  }, [cart.lines]);

  useEffect(() => {
    if (!productIdsKey) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/v1/products/by-ids?ids=${encodeURIComponent(productIdsKey)}`)
      .then(async (res) => {
        if (!res.ok) return { items: [] as Product[] };
        return (await res.json()) as { items: Product[] };
      })
      .then((data) => {
        if (cancelled) return;
        setProducts(data.items ?? []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productIdsKey]);

  const resolved = useMemo(
    () => cart.lines.map((line) => resolveLine(line, products, loading)),
    [cart.lines, products, loading],
  );

  const waLines = useMemo(
    () =>
      resolved
        .filter((r) => r.product && !r.issue)
        .map((r) => ({
          nome: r.line.nome,
          slug: r.line.slug,
          referencia: r.product?.referencia,
          tamanho: r.line.tamanho,
          cor: r.line.cor,
          quantidade: r.line.quantidade,
        })),
    [resolved],
  );

  const message = useMemo(
    () =>
      cartWaMessage(
        {
          mensagemProdutoParts: wa.mensagemProdutoParts,
          mensagemCarrinhoParts: wa.mensagemCarrinhoParts,
          mensagemCarrinhoItemCompactoParts: wa.mensagemCarrinhoItemCompactoParts,
          mensagemCarrinhoFormatoItens: wa.mensagemCarrinhoFormatoItens,
          mensagemProdutoIncluirReferencia:
            wa.mensagemProdutoIncluirReferencia,
        },
        waLines,
      ),
    [wa, waLines],
  );

  const waHref =
    waLines.length > 0 && wa.telefone
      ? waLink(wa.telefone, message)
      : "";
  const messageTooLong =
    message.length > 0 &&
    waMessageEncodedLength(message) > WA_MESSAGE_URL_WARN_LENGTH;

  const carrinho = site.textos.carrinho;

  return (
    <div
      className={`container cart-page${cart.lines.length === 0 ? " cart-page--empty" : ""}`}
    >
      <header className="cart-page__head">
        <h1 className="vn-section-title cart-page__title">{carrinho.titulo}</h1>
        {cart.lines.length > 0 ? (
          <button
            type="button"
            className="cart-page__clear link-btn"
            onClick={() => cart.clear()}
          >
            {carrinho.esvaziar}
          </button>
        ) : null}
      </header>

      {cart.lines.length === 0 ? (
        <div className="cart-page__empty-state">
          <div className="cart-page__empty-icon" aria-hidden="true">
            <CartEmptyIcon />
          </div>
          <h2 className="cart-page__empty-title">{carrinho.emptyTitulo}</h2>
          <p className="cart-page__empty-lead">{carrinho.emptyLead}</p>
          <div className="cart-page__empty-actions">
            <Link href="/catalogo" className="btn btn-primary">
              <CartIcon size={18} className="btn__icon" />
              {carrinho.verCatalogo}
            </Link>
            <Link href="/" className="cart-page__empty-link">
              {carrinho.voltarHome}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <ul className="cart-page__list">
            {resolved.map((row) => (
              <CartLineRow
                key={row.key}
                row={row}
                onQty={(qty) => cart.updateQty(row.key, qty)}
                onRemove={() => cart.removeLine(row.key)}
              />
            ))}
          </ul>

          {messageTooLong ? (
            <p className="cart-page__warn" role="status">
              {carrinho.limiteWa}
            </p>
          ) : null}

          {wa.mostrar && waHref ? (
            <div className="cart-page__cta">
              <WhatsAppButton
                className="btn btn-whatsapp cart-page__wa"
                href={waHref}
                waSource="cart"
              >
                {carrinho.enviarWhatsapp}
              </WhatsAppButton>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function CartLineRow({
  row,
  onQty,
  onRemove,
}: {
  row: ResolvedLine;
  onQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const { line, product, issue, maxQty, priceLabel } = row;
  const cover = product ? coverImage(product) : null;
  const img = mediaUrl(line.thumbPath ?? cover?.path);

  return (
    <li className="cart-line" data-issue={issue ?? undefined}>
      <Link
        href={`/produto/${line.slug}`}
        className="cart-line__media"
        tabIndex={-1}
        aria-hidden="true"
      >
        {img ? (
          <Image
            src={img}
            alt=""
            width={96}
            height={96}
            sizes={IMAGE_SIZES.card}
            className="cart-line__img"
          />
        ) : (
          <span className="cart-line__placeholder">{line.nome.charAt(0)}</span>
        )}
      </Link>
      <div className="cart-line__body">
        <Link href={`/produto/${line.slug}`} className="cart-line__name">
          {line.nome}
        </Link>
        {line.tamanho || line.cor ? (
          <p className="cart-line__meta">
            {[line.tamanho, line.cor].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <p className="cart-line__price price">{priceLabel}</p>
        {issue === "missing" ? (
          <p className="cart-line__alert">Produto ou variação indisponível.</p>
        ) : null}
        {issue === "stock" ? (
          <p className="cart-line__alert">Sem estoque no momento.</p>
        ) : null}
      </div>
      <div className="cart-line__actions">
        <label className="cart-line__qty">
          <span className="visually-hidden">Quantidade</span>
          <input
            type="number"
            min={1}
            max={maxQty > 0 ? maxQty : undefined}
            value={line.quantidade}
            disabled={issue != null || maxQty <= 0}
            onChange={(e) => {
              const raw = Number.parseInt(e.target.value, 10);
              if (!Number.isFinite(raw)) return;
              const clamped =
                maxQty > 0 ? clampQuantity(raw, maxQty) : raw;
              if (clamped >= 1) onQty(clamped);
            }}
          />
        </label>
        <button
          type="button"
          className="cart-line__remove link-btn"
          onClick={onRemove}
        >
          Remover
        </button>
      </div>
    </li>
  );
}

function CartEmptyIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}
