import type { Product, ProductVariant } from "@/src/schemas/product";

function hasVariantOverride(
  variant: ProductVariant | null | undefined,
): variant is ProductVariant & { preco: number } {
  return variant != null && variant.preco != null;
}

/** Preço cobrado do produto (promo global ou preço normal). */
export function productSellPrice(product: Product): number {
  return product.precoPromocional ?? product.preco;
}

/** Preço cobrado para uma variante (override ou preço efetivo global). */
export function variantSellPrice(
  product: Product,
  variant?: ProductVariant | null,
): number {
  if (hasVariantOverride(variant)) return variant.preco;
  return productSellPrice(product);
}

export type DisplayPrice = {
  sell: number;
  compareAt: number | null;
};

/** Porcentagem de desconto arredondada; null se não houver promo válida. */
export function discountPercent(
  sell: number,
  compareAt: number | null,
): number | null {
  if (compareAt == null || compareAt <= 0 || sell >= compareAt) return null;
  const pct = Math.round((1 - sell / compareAt) * 100);
  return pct > 0 ? pct : null;
}

/**
 * Preço exibido na loja.
 * Com override: compareAt = preco do produto só se override for menor (promo visual).
 * Sem override: compareAt = preco se houver promo global.
 */
export function variantDisplayPrice(
  product: Product,
  variant?: ProductVariant | null,
): DisplayPrice {
  if (hasVariantOverride(variant)) {
    const sell = variant.preco;
    return {
      sell,
      compareAt: sell < product.preco ? product.preco : null,
    };
  }

  const sell = productSellPrice(product);
  return {
    sell,
    compareAt: product.precoPromocional != null ? product.preco : null,
  };
}

export type FromPrice = {
  sell: number;
  showFrom: boolean;
};

/**
 * Menor preço cobrado entre variantes ativas (estoque > 0).
 * Sem variantes ativas, usa o preço efetivo global.
 * showFrom quando há preços distintos entre ativas ou o mín. difere do global.
 */
export function productFromPrice(product: Product): FromPrice {
  const globalSell = productSellPrice(product);
  const active = product.variantes.filter((v) => v.estoque > 0);

  if (active.length === 0) {
    return { sell: globalSell, showFrom: false };
  }

  const sells = active.map((v) => variantSellPrice(product, v));
  const minSell = Math.min(...sells);
  const distinct = new Set(sells).size >= 2;
  const differsFromGlobal = minSell !== globalSell;

  return {
    sell: minSell,
    showFrom: distinct || differsFromGlobal,
  };
}
