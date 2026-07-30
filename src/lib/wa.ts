import {
  buildProductWaItemBlockTemplate,
  DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
  productInterestHeading,
  type ProductWaTemplateParts,
} from "@/src/lib/wa-product-template";
import type { CartWaTemplateParts } from "@/src/lib/wa-cart-template";
import {
  buildCompactCartItemTemplate,
  DEFAULT_COMPACT_CART_ITEM_PARTS,
  type CompactCartItemParts,
} from "@/src/lib/wa-compact-template";
import {
  normalizeProductReferencia,
  productNomeForWaMessage,
} from "@/src/lib/product-referencia";

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Digits for storage / display: DDD + número (máx. 11).
 * Aceita valores legados com DDI 55 e remove o prefixo.
 */
export function normalizeWaDigits(value: string): string {
  let d = digitsOnly(value);
  // Legacy / paste: 55 + DDD + número (12–13 dígitos)
  if (d.startsWith("55") && d.length >= 12 && d.length <= 13) {
    d = d.slice(2);
  }
  return d.slice(0, 11);
}

/** Formats BR phone as (DD) 9XXXX-XXXX or (DD) XXXX-XXXX. */
export function formatBrWhatsApp(value: string): string {
  const d = normalizeWaDigits(value);
  if (!d) return "";

  let out = `(${d.slice(0, 2)}`;
  if (d.length <= 2) return out;

  out += ")";
  const local = d.slice(2);
  if (local.length === 0) return out;

  if (local.length <= 4) {
    return `${out} ${local}`;
  }

  if (local.length <= 8) {
    // Landline: XXXX-XXXX
    return `${out} ${local.slice(0, 4)}-${local.slice(4)}`;
  }

  // Mobile: 9XXXX-XXXX
  return `${out} ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

/** Digits for wa.me — always includes DDI 55. */
export function toWaMeDigits(phoneDigits: string): string {
  const d = normalizeWaDigits(phoneDigits);
  if (!d) return "";
  return `55${d}`;
}

export function waLink(phoneDigits: string, message: string): string {
  const digits = toWaMeDigits(phoneDigits);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Public site origin for product links in WhatsApp messages. */
export function publicSiteUrl(explicit?: string): string {
  if (explicit?.trim()) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

/** Clamp quantity to 1..max; returns 0 when max <= 0. */
export function clampQuantity(value: number, max: number): number {
  if (!Number.isFinite(max) || max <= 0) return 0;
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(1, Math.floor(value)), Math.floor(max));
}

/** Product page URL with optional variant pre-selection. */
export function productPageUrl(
  slug: string,
  opts?: {
    tamanho?: string;
    cor?: string;
    quantidade?: number;
    siteUrl?: string;
  },
): string {
  const base = publicSiteUrl(opts?.siteUrl);
  const url = new URL(`${base}/produto/${encodeURIComponent(slug)}`);
  const tamanho = opts?.tamanho?.trim() ?? "";
  const cor = opts?.cor?.trim() ?? "";
  if (tamanho) url.searchParams.set("tamanho", tamanho);
  if (cor) url.searchParams.set("cor", cor);
  const qty = opts?.quantidade;
  if (typeof qty === "number" && Number.isFinite(qty) && qty >= 1) {
    url.searchParams.set("quantidade", String(Math.floor(qty)));
  }
  return url.toString();
}

function cleanWaMessageText(msg: string): string {
  return msg
    .replace(/^[ \t]*-[ \t]*-[ \t]*\r?\n/gm, "")
    .replace(/^[ \t]*-[ \t]*\r?\n/gm, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function productVariantResumo(
  tamanho?: string,
  cor?: string,
  quantidade?: number,
): string {
  const t = tamanho?.trim() ?? "";
  const c = cor?.trim() ?? "";
  const parts: string[] = [];
  if (t) parts.push(`Tamanho: ${t}`);
  if (c) parts.push(`Cor: ${c}`);
  if (
    typeof quantidade === "number" &&
    Number.isFinite(quantidade) &&
    quantidade >= 1
  ) {
    parts.push(`Quantidade: ${Math.floor(quantidade)}`);
  }
  return parts.join(" / ");
}

type ProductWaFillOpts = {
  tamanho?: string;
  cor?: string;
  quantidade?: number;
  siteUrl?: string;
  referencia?: string;
  mensagemProdutoIncluirReferencia?: boolean;
};

function resolveProductWaFields(
  nome: string,
  slug: string,
  opts?: ProductWaFillOpts,
) {
  const tamanho = opts?.tamanho?.trim() ?? "";
  const cor = opts?.cor?.trim() ?? "";
  const quantidade =
    typeof opts?.quantidade === "number" &&
    Number.isFinite(opts.quantidade) &&
    opts.quantidade >= 1
      ? Math.floor(opts.quantidade)
      : undefined;
  const referencia = normalizeProductReferencia(opts?.referencia);
  const nomeDisplay = productNomeForWaMessage(nome, {
    referencia,
    incluirReferencia: opts?.mensagemProdutoIncluirReferencia,
  });
  const url = productPageUrl(slug, {
    tamanho: tamanho || undefined,
    cor: cor || undefined,
    quantidade,
    siteUrl: opts?.siteUrl,
  });
  const resumo = productVariantResumo(tamanho, cor, quantidade);
  return {
    tamanho,
    cor,
    quantidade,
    referencia,
    nomeDisplay,
    url,
    resumo,
    slug,
  };
}

/** Fills system template tokens only — use on blocks generated by build*, not user free text. */
export function fillProductWaTokens(
  template: string,
  nome: string,
  slug: string,
  opts?: ProductWaFillOpts,
): string {
  const f = resolveProductWaFields(nome, slug, opts);
  return template
    .replaceAll("{url}", f.url)
    .replaceAll("{resumo}", f.resumo)
    .replaceAll("{nome}", f.nomeDisplay)
    .replaceAll("{referencia}", f.referencia)
    .replaceAll("{slug}", f.slug)
    .replaceAll("{tamanho}", f.tamanho)
    .replaceAll("{cor}", f.cor)
    .replaceAll(
      "{quantidade}",
      f.quantidade != null ? String(f.quantidade) : "",
    );
}

/**
 * Fills WhatsApp product template tokens:
 * `{url}`, `{resumo}`, `{nome}`, `{referencia}`, `{slug}`, `{tamanho}`, `{cor}`, `{quantidade}`.
 */
export function productWaMessage(
  template: string,
  nome: string,
  slug: string,
  opts?: ProductWaFillOpts,
): string {
  return cleanWaMessageText(fillProductWaTokens(template, nome, slug, opts));
}

export type ProductWaMessageFromPartsOpts = ProductWaFillOpts & {
  formatoItens?: "produto" | "compacto";
  itemCompactoParts?: CompactCartItemParts;
};

/** Assembles a single-product message; user outro/intro are not token-substituted. */
export function productWaMessageFromParts(
  parts: ProductWaTemplateParts,
  nome: string,
  slug: string,
  opts?: ProductWaMessageFromPartsOpts,
): string {
  const heading = `*${parts.intro.trim()}:*`;
  let filledItem: string;
  if (opts?.formatoItens === "compacto") {
    const compactParts = opts.itemCompactoParts ?? DEFAULT_COMPACT_CART_ITEM_PARTS;
    const itemTpl = buildCompactCartItemTemplate(compactParts);
    filledItem = fillProductWaTokens(itemTpl, nome, slug, opts);
  } else {
    const itemTpl = buildProductWaItemBlockTemplate(parts);
    filledItem = fillProductWaTokens(itemTpl, nome, slug, opts);
  }
  const segments = [heading, cleanWaMessageText(filledItem)];
  const outro = parts.outro.trim();
  if (outro) segments.push(outro);
  return cleanWaMessageText(segments.join("\n\n"));
}

export type CartWaLineInput = {
  nome: string;
  slug: string;
  referencia?: string;
  tamanho?: string;
  cor?: string;
  quantidade: number;
};

export type CartWaConfig = {
  mensagemProdutoParts: ProductWaTemplateParts;
  mensagemCarrinhoParts: CartWaTemplateParts;
  mensagemCarrinhoItemCompactoParts: CompactCartItemParts;
  mensagemCarrinhoFormatoItens: "produto" | "compacto";
  mensagemProdutoIncluirReferencia?: boolean;
};

function fillCompactCartItemTemplate(
  template: string,
  line: CartWaLineInput,
  siteUrl?: string,
  incluirReferencia?: boolean,
): string {
  return fillProductWaTokens(template, line.nome, line.slug, {
    tamanho: line.tamanho,
    cor: line.cor,
    quantidade: line.quantidade,
    siteUrl,
    referencia: line.referencia,
    mensagemProdutoIncluirReferencia: incluirReferencia,
  });
}

/** Approximate wa.me URL length warning threshold (encoded message). */
export const WA_MESSAGE_URL_WARN_LENGTH = 1800;

export function waMessageEncodedLength(message: string): number {
  return encodeURIComponent(message).length;
}

function cartProductFormatItensBlock(
  config: Pick<
    CartWaConfig,
    "mensagemProdutoParts" | "mensagemProdutoIncluirReferencia"
  >,
  lines: CartWaLineInput[],
  siteUrl?: string,
): string {
  if (lines.length === 0) return "";

  const parts = config.mensagemProdutoParts ?? DEFAULT_PRODUCT_WA_TEMPLATE_PARTS;
  const itemTpl = buildProductWaItemBlockTemplate(parts);
  const heading = productInterestHeading(parts.intro, lines.length);
  const incluirReferencia = Boolean(config.mensagemProdutoIncluirReferencia);

  const items = lines
    .map((line) =>
      cleanWaMessageText(
        fillProductWaTokens(itemTpl, line.nome, line.slug, {
          tamanho: line.tamanho,
          cor: line.cor,
          quantidade: line.quantidade,
          siteUrl,
          referencia: line.referencia,
          mensagemProdutoIncluirReferencia: incluirReferencia,
        }),
      ),
    )
    .filter(Boolean);

  return items.length > 0 ? `${heading}\n${items.join("\n\n")}` : heading;
}

export function formatCartItemMessage(
  config: CartWaConfig,
  line: CartWaLineInput,
  siteUrl?: string,
): string {
  if (config.mensagemCarrinhoFormatoItens === "compacto") {
    const tpl = buildCompactCartItemTemplate(
      config.mensagemCarrinhoItemCompactoParts,
    );
    return fillCompactCartItemTemplate(
      tpl,
      line,
      siteUrl,
      config.mensagemProdutoIncluirReferencia,
    );
  }
  return cartProductFormatItensBlock(config, [line], siteUrl);
}

export function cartWaMessage(
  config: CartWaConfig,
  lines: CartWaLineInput[],
  siteUrl?: string,
): string {
  let itensBlock: string;
  if (config.mensagemCarrinhoFormatoItens === "compacto") {
    const items = lines
      .map((line) => formatCartItemMessage(config, line, siteUrl))
      .filter(Boolean);
    itensBlock = items.join("\n\n");
  } else {
    itensBlock = cartProductFormatItensBlock(config, lines, siteUrl);
  }

  const envelope = config.mensagemCarrinhoParts;
  const segments: string[] = [];
  const before = envelope.beforeItens.trim();
  if (before) segments.push(before);
  if (itensBlock) segments.push(itensBlock);
  const outro = envelope.outro.trim();
  if (outro) segments.push(outro);

  return cleanWaMessageText(segments.join("\n\n"));
}
