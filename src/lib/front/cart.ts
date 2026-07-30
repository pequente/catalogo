export type CartLine = {
  productId: string;
  variantId: string | null;
  slug: string;
  nome: string;
  tamanho?: string;
  cor?: string;
  quantidade: number;
  thumbPath?: string;
};

export type CartState = {
  version: 1;
  lines: CartLine[];
};

export const CART_STORAGE_KEY = "vn-cart-v1";
export const CART_BROADCAST_CHANNEL = "vn-cart";

export function cartLineKey(line: Pick<CartLine, "productId" | "variantId">): string {
  return `${line.productId}:${line.variantId ?? "_"}`;
}

export function emptyCartState(): CartState {
  return { version: 1, lines: [] };
}

export function cartUnitCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + (l.quantidade > 0 ? l.quantidade : 0), 0);
}

export function mergeCartLine(lines: CartLine[], incoming: CartLine): CartLine[] {
  const key = cartLineKey(incoming);
  const idx = lines.findIndex((l) => cartLineKey(l) === key);
  if (idx === -1) {
    return [...lines, { ...incoming, quantidade: Math.max(1, Math.floor(incoming.quantidade)) }];
  }
  const next = [...lines];
  const existing = next[idx]!;
  next[idx] = {
    ...existing,
    ...incoming,
    quantidade: Math.max(
      1,
      Math.floor(existing.quantidade + incoming.quantidade),
    ),
  };
  return next;
}

export function parseCartState(raw: unknown): CartState {
  if (!raw || typeof raw !== "object") return emptyCartState();
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.lines)) return emptyCartState();
  const lines: CartLine[] = [];
  for (const item of o.lines) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId : "";
    const slug = typeof row.slug === "string" ? row.slug : "";
    const nome = typeof row.nome === "string" ? row.nome : "";
    const quantidade =
      typeof row.quantidade === "number" && row.quantidade >= 1
        ? Math.floor(row.quantidade)
        : 0;
    if (!productId || !slug || !nome || quantidade < 1) continue;
    const variantId =
      row.variantId === null || row.variantId === undefined
        ? null
        : typeof row.variantId === "string"
          ? row.variantId
          : null;
    lines.push({
      productId,
      variantId,
      slug,
      nome,
      quantidade,
      ...(typeof row.tamanho === "string" && row.tamanho ? { tamanho: row.tamanho } : {}),
      ...(typeof row.cor === "string" && row.cor ? { cor: row.cor } : {}),
      ...(typeof row.thumbPath === "string" && row.thumbPath
        ? { thumbPath: row.thumbPath }
        : {}),
    });
  }
  return { version: 1, lines };
}
