import type { CompactCartItemPartsInput } from "@/src/lib/wa-template-validation";
import { DEFAULT_CART_WA_COMPACT_ITEM } from "@/src/lib/wa-cart-template";

export type CompactCartItemParts = CompactCartItemPartsInput;

export const DEFAULT_COMPACT_CART_ITEM_PARTS: CompactCartItemParts = {
  bullet: "•",
  showResumo: true,
  showUrl: true,
};

function bulletPrefix(bullet: CompactCartItemParts["bullet"]): string {
  if (bullet === "none") return "";
  return bullet === "•" ? "• " : "- ";
}

export function buildCompactCartItemTemplate(
  parts: CompactCartItemParts,
): string {
  let line = `${bulletPrefix(parts.bullet)}{nome}`;
  if (parts.showResumo) {
    line += " — {resumo}";
  }
  if (parts.showUrl) {
    line += " {url}";
  }
  return line;
}

export const DEFAULT_CART_WA_COMPACT_ITEM_FROM_PARTS = buildCompactCartItemTemplate(
  DEFAULT_COMPACT_CART_ITEM_PARTS,
);

/** Best-effort parse of legacy compact line templates into structured parts. */
export function parseCompactCartItemTemplate(
  template: string,
): CompactCartItemParts {
  const t = template.replace(/\r\n/g, "\n").trim();
  if (
    t === DEFAULT_CART_WA_COMPACT_ITEM ||
    t === DEFAULT_CART_WA_COMPACT_ITEM_FROM_PARTS
  ) {
    return { ...DEFAULT_COMPACT_CART_ITEM_PARTS };
  }

  let rest = t;
  let bullet: CompactCartItemParts["bullet"] = "none";
  if (rest.startsWith("• ")) {
    bullet = "•";
    rest = rest.slice(2);
  } else if (rest.startsWith("- ")) {
    bullet = "-";
    rest = rest.slice(2);
  }

  const showResumo = rest.includes("{resumo}");
  const showUrl = rest.includes("{url}");

  if (!rest.includes("{nome}")) {
    return { ...DEFAULT_COMPACT_CART_ITEM_PARTS };
  }

  return {
    bullet,
    showResumo,
    showUrl,
  };
}
