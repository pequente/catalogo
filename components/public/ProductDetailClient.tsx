"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product, ProductVariant } from "@/src/schemas/product";
import { formatBrl } from "@/src/lib/front/format";
import {
  discountPercent,
  variantDisplayPrice,
} from "@/src/lib/front/pricing";
import {
  findVariant,
  uniqueCores,
  uniqueTamanhos,
} from "@/src/lib/front/variants";
import { clampQuantity, productWaMessageFromParts, waLink } from "@/src/lib/wa";
import type { ProductWaTemplateParts } from "@/src/lib/wa-product-template";
import type { CompactCartItemParts } from "@/src/lib/wa-compact-template";
import { ProductGallery } from "@/components/public/ProductGallery";
import { ProductVariantPicker } from "@/components/public/ProductVariantPicker";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { CartIcon } from "@/components/public/icons/StorefrontIcons";
import { useCartOptional } from "@/components/public/cart/CartProvider";
import { coverImage } from "@/src/lib/front/media";
import { selecioneVarianteFromDims } from "@/src/lib/front/store-copy";
import type { SiteDimensao, SiteTextosExtended } from "@/src/schemas/site-personalization";

type Props = {
  product: Product;
  productCopy: SiteTextosExtended["produto"];
  dimensoes: SiteDimensao[];
  whatsappCurto: string;
  waPhone: string;
  waProductParts: ProductWaTemplateParts;
  waIncluirReferencia?: boolean;
  waProdutoFormatoItens?: "produto" | "compacto";
  waProdutoItemCompactoParts?: CompactCartItemParts;
  showWhatsApp?: boolean;
  initialTamanho?: string;
  initialCor?: string;
  initialQuantidade?: number;
  siteUrl?: string;
  mostrarCarrinho?: boolean;
};

function resolveInitialVariant(
  product: Product,
  initialTamanho?: string,
  initialCor?: string,
): {
  tamanho: string | null;
  cor: string | null;
  variant: ProductVariant | null;
} {
  const tamanho = initialTamanho?.trim() || null;
  const cor = initialCor?.trim() || null;
  if (!tamanho || !cor) {
    return { tamanho: null, cor: null, variant: null };
  }
  const variant = findVariant(product.variantes, tamanho, cor);
  if (!variant) {
    return { tamanho: null, cor: null, variant: null };
  }
  return { tamanho, cor, variant };
}

function resolveInitialQuantidade(
  variant: ProductVariant | null,
  hasVariants: boolean,
  initialQuantidade?: number,
): number {
  if (!hasVariants) return 1;
  if (!variant || variant.estoque <= 0) {
    return 1;
  }
  const requested =
    typeof initialQuantidade === "number" && Number.isFinite(initialQuantidade)
      ? initialQuantidade
      : 1;
  return clampQuantity(requested, variant.estoque) || 1;
}

function parseQuantidadeSearchParam(raw: string | null): number | undefined {
  if (!raw?.trim()) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

/** Applies `tamanho`, `cor` and `quantidade` from the browser URL (share links). */
function resolveVariantFromSearchParams(
  product: Product,
  searchParams: URLSearchParams,
): ReturnType<typeof resolveInitialVariant> & { quantidade?: number } {
  const urlTamanho = searchParams.get("tamanho")?.trim() || undefined;
  const urlCor = searchParams.get("cor")?.trim() || undefined;
  const quantidade = parseQuantidadeSearchParam(searchParams.get("quantidade"));

  if (!urlTamanho && !urlCor) {
    return { tamanho: null, cor: null, variant: null, quantidade };
  }

  let tamanho = urlTamanho;
  let cor = urlCor;

  if (tamanho && !cor) {
    const cores = uniqueCores(product.variantes);
    if (cores.length === 1) {
      cor = cores[0];
    }
  } else if (cor && !tamanho) {
    const tamanhos = uniqueTamanhos(product.variantes);
    if (tamanhos.length === 1) {
      tamanho = tamanhos[0];
    }
  }

  const resolved = resolveInitialVariant(product, tamanho, cor);
  if (resolved.variant) {
    return { ...resolved, quantidade };
  }

  if (tamanho && !cor) {
    const match = uniqueTamanhos(product.variantes).find(
      (t) => t.trim().toLowerCase() === tamanho!.trim().toLowerCase(),
    );
    if (match) {
      return { tamanho: match, cor: null, variant: null, quantidade };
    }
  }
  if (cor && !tamanho) {
    const match = uniqueCores(product.variantes).find(
      (c) => c.trim().toLowerCase() === cor!.trim().toLowerCase(),
    );
    if (match) {
      return { cor: match, tamanho: null, variant: null, quantidade };
    }
  }

  return { tamanho: null, cor: null, variant: null, quantidade };
}

function buildProductDetailSearchParams(
  tamanho: string | null,
  cor: string | null,
  quantidade: number,
  variant: ProductVariant | null,
  hasVariants: boolean,
): URLSearchParams {
  const params = new URLSearchParams();
  if (!hasVariants) return params;
  if (tamanho) params.set("tamanho", tamanho);
  if (cor) params.set("cor", cor);
  if (variant && quantidade >= 1) {
    params.set("quantidade", String(quantidade));
  }
  return params;
}

function productDetailQueryMatchesUrl(
  searchParams: URLSearchParams,
  tamanho: string | null,
  cor: string | null,
  quantidade: number,
  variant: ProductVariant | null,
  hasVariants: boolean,
): boolean {
  const expected = buildProductDetailSearchParams(
    tamanho,
    cor,
    quantidade,
    variant,
    hasVariants,
  );
  return expected.toString() === searchParams.toString();
}

export function ProductDetailClient({
  product,
  productCopy,
  dimensoes,
  whatsappCurto,
  waPhone,
  waProductParts,
  waIncluirReferencia = false,
  waProdutoFormatoItens = "produto",
  waProdutoItemCompactoParts,
  showWhatsApp = true,
  initialTamanho,
  initialCor,
  initialQuantidade,
  siteUrl,
  mostrarCarrinho = true,
}: Props) {
  const cart = useCartOptional();
  const cartActive = Boolean(mostrarCarrinho && cart?.enabled);
  const hasVariants = product.variantes.length > 0;
  const selecioneVariante = selecioneVarianteFromDims(
    dimensoes,
    productCopy.selecioneVariante,
  );
  const initial = resolveInitialVariant(product, initialTamanho, initialCor);
  const [tamanho, setTamanho] = useState<string | null>(initial.tamanho);
  const [cor, setCor] = useState<string | null>(initial.cor);
  const [variant, setVariant] = useState<ProductVariant | null>(
    initial.variant,
  );
  const [quantidade, setQuantidade] = useState(() =>
    resolveInitialQuantidade(initial.variant, hasVariants, initialQuantidade),
  );
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    const fromUrl = resolveVariantFromSearchParams(product, searchParams);
    const hasUrlSelection =
      fromUrl.tamanho != null ||
      fromUrl.cor != null ||
      fromUrl.variant != null ||
      fromUrl.quantidade != null;
    if (!hasUrlSelection) return;

    if (fromUrl.tamanho !== null) setTamanho(fromUrl.tamanho);
    if (fromUrl.cor !== null) setCor(fromUrl.cor);
    setVariant(fromUrl.variant);
    if (fromUrl.variant) {
      setQuantidade(
        resolveInitialQuantidade(
          fromUrl.variant,
          hasVariants,
          fromUrl.quantidade ?? initialQuantidade,
        ),
      );
    }
  }, [searchParams, product, hasVariants, initialQuantidade]);

  useEffect(() => {
    if (
      productDetailQueryMatchesUrl(
        searchParams,
        tamanho,
        cor,
        quantidade,
        variant,
        hasVariants,
      )
    ) {
      return;
    }
    const params = buildProductDetailSearchParams(
      tamanho,
      cor,
      quantidade,
      variant,
      hasVariants,
    );
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [
    tamanho,
    cor,
    quantidade,
    variant,
    hasVariants,
    pathname,
    router,
    searchParams,
  ]);

  const selectionComplete =
    !hasVariants || (Boolean(tamanho) && Boolean(cor) && Boolean(variant));
  const inStock = !hasVariants || (variant != null && variant.estoque > 0);
  const qtyValid =
    !hasVariants ||
    (variant != null &&
      variant.estoque > 0 &&
      quantidade >= 1 &&
      quantidade <= variant.estoque);
  const selectionReady = selectionComplete && inStock && qtyValid;

  let waHref: string | null = null;
  if (selectionReady) {
    const msg = productWaMessageFromParts(
      waProductParts,
      product.nome,
      product.slug,
      {
        tamanho: tamanho ?? undefined,
        cor: cor ?? undefined,
        quantidade,
        siteUrl,
        referencia: product.referencia,
        mensagemProdutoIncluirReferencia: waIncluirReferencia,
        formatoItens: waProdutoFormatoItens,
        itemCompactoParts: waProdutoItemCompactoParts,
      },
    );
    waHref = waLink(waPhone, msg);
  }

  let ctaLabel = productCopy.ctaInteresse;
  if (hasVariants && !selectionComplete) {
    ctaLabel = selecioneVariante;
  } else if (hasVariants && selectionComplete && !inStock) {
    ctaLabel = productCopy.badgeEsgotado;
  }

  const dualCta = cartActive && showWhatsApp;

  let waLabel = productCopy.ctaInteresse;
  if (dualCta) {
    waLabel = selectionReady ? productCopy.ctaInteresse : whatsappCurto;
  } else {
    waLabel = ctaLabel;
  }

  let waAriaLabel: string | undefined;
  if (!selectionReady) {
    if (hasVariants && !selectionComplete) {
      waAriaLabel = productCopy.waSelecioneVariante;
    } else if (hasVariants && selectionComplete && !inStock) {
      waAriaLabel = productCopy.waEsgotado;
    }
  }

  const waIdle = !selectionReady;

  const { sell, compareAt } = variantDisplayPrice(product, variant);
  const price = formatBrl(sell);
  const fullPrice = compareAt != null ? formatBrl(compareAt) : null;
  const pct = discountPercent(sell, compareAt);
  const showCtaBar = showWhatsApp || cartActive;

  function handleAddToCart() {
    if (!cartActive || !cart || !selectionReady) return;
    const cover = coverImage(product);
    cart.addLine({
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      nome: product.nome,
      tamanho: tamanho ?? undefined,
      cor: cor ?? undefined,
      quantidade: hasVariants ? quantidade : 1,
      thumbPath: cover?.path,
    });
  }

  let cartCtaLabel = productCopy.ctaCarrinho;
  if (hasVariants && !selectionComplete) {
    cartCtaLabel = selecioneVariante;
  } else if (hasVariants && selectionComplete && !inStock) {
    cartCtaLabel = productCopy.badgeEsgotado;
  }

  function handleVariantChange(next: {
    tamanho: string | null;
    cor: string | null;
    variant: ProductVariant | null;
  }) {
    setTamanho(next.tamanho);
    setCor(next.cor);
    setVariant(next.variant);
    if (!next.variant || next.variant.estoque <= 0) {
      setQuantidade(1);
      return;
    }
    setQuantidade((prev) => clampQuantity(prev, next.variant!.estoque) || 1);
  }

  function handleQuantidadeChange(next: number) {
    if (!variant || variant.estoque <= 0) {
      setQuantidade(1);
      return;
    }
    setQuantidade(clampQuantity(next, variant.estoque) || 1);
  }

  return (
    <div className="product-detail container">
      <div className="product-detail__grid">
        <ProductGallery product={product} discountPercent={pct} />

        <div className="product-detail__info">
          {product.lancamento || product.status === "esgotado" ? (
            <div className="product-detail__badges">
              {product.lancamento ? (
                <span className="badge">{productCopy.badgeNovo}</span>
              ) : null}
              {product.status === "esgotado" ? (
                <span className="badge badge--muted">{productCopy.badgeEsgotado}</span>
              ) : null}
            </div>
          ) : null}

          <h1 className="product-detail__title">{product.nome}</h1>
          {product.referencia?.trim() ? (
            <p className="product-detail__ref">
              Referência: {product.referencia.trim()}
            </p>
          ) : null}

          <p className="product-detail__price price">
            {price}
            {fullPrice ? (
              <span className="product-detail__price-old">{fullPrice}</span>
            ) : null}
          </p>

          {product.descricao ? (
            <p className="product-detail__desc">{product.descricao}</p>
          ) : null}

          {hasVariants ? (
            <ProductVariantPicker
              variantes={product.variantes}
              tamanho={tamanho}
              cor={cor}
              quantidade={quantidade}
              dimensoes={dimensoes}
              copy={productCopy}
              selecioneVariante={selecioneVariante}
              onChange={handleVariantChange}
              onQuantidadeChange={handleQuantidadeChange}
            />
          ) : null}

          {showCtaBar ? (
            <div
              className={`product-detail__cta${dualCta ? " product-detail__cta--dual" : ""}`}
            >
              <div className="product-detail__sticky-price" aria-hidden="true">
                <span className="price">{price}</span>
              </div>
              <div className="product-detail__cta-actions">
                {cartActive ? (
                  <button
                    type="button"
                    className="btn btn-primary product-detail__cart"
                    disabled={!selectionReady}
                    onClick={handleAddToCart}
                  >
                    <CartIcon size={18} className="btn__icon" />
                    <span className="product-detail__cart-label">
                      {cartCtaLabel}
                    </span>
                  </button>
                ) : null}
                {showWhatsApp ? (
                  waHref ? (
                    <WhatsAppButton
                      className="btn btn-whatsapp product-detail__wa"
                      href={waHref}
                      waSource="pdp"
                      produtoId={product.id}
                      ariaLabel={waAriaLabel}
                    >
                      {waLabel}
                    </WhatsAppButton>
                  ) : (
                    <WhatsAppButton
                      className="btn btn-whatsapp product-detail__wa"
                      href=""
                      waSource="pdp"
                      produtoId={product.id}
                      disabled
                      idle={waIdle}
                      ariaLabel={waAriaLabel}
                    >
                      {waLabel}
                    </WhatsAppButton>
                  )
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
