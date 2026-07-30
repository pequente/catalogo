export type CartWaTemplateParts = {
  beforeItens: string;
  outro: string;
};

export const DEFAULT_CART_WA_TEMPLATE_PARTS: CartWaTemplateParts = {
  beforeItens: "Gostaria de pedir os itens abaixo:",
  outro: "Podem me confirmar disponibilidade e valores?",
};

export const LEGACY_CART_WA_ENVELOPE =
  "Olá! Gostaria de pedir os itens abaixo:\n\n{itens}\n\nPodem me confirmar disponibilidade e valores?";

export function buildCartWaTemplate(parts: CartWaTemplateParts): string {
  const before = parts.beforeItens.trim();
  const outro = parts.outro.trim();
  let msg = before ? `${before}\n\n{itens}` : "{itens}";
  if (outro) msg += `\n\n${outro}`;
  return msg;
}

export function parseCartWaTemplate(template: string): CartWaTemplateParts {
  const t = template.replace(/\r\n/g, "\n");
  const token = "{itens}";
  const idx = t.indexOf(token);
  if (idx === -1) {
    return {
      beforeItens: DEFAULT_CART_WA_TEMPLATE_PARTS.beforeItens,
      outro: t.trim(),
    };
  }
  const beforeItens = t.slice(0, idx).trim();
  const outro = t.slice(idx + token.length).replace(/^\n+/, "").trim();
  return { beforeItens, outro };
}

function normalizeCartWaTemplate(template: string): string {
  return template.replace(/\r\n/g, "\n").trim();
}

export function isRecognizedCartWaTemplate(template: string): boolean {
  const parts = parseCartWaTemplate(template);
  return (
    normalizeCartWaTemplate(buildCartWaTemplate(parts)) ===
    normalizeCartWaTemplate(template)
  );
}

export const DEFAULT_CART_WA_COMPACT_ITEM = "• {nome} — {resumo} {url}";

export const DEFAULT_CART_WA_ENVELOPE = buildCartWaTemplate(
  DEFAULT_CART_WA_TEMPLATE_PARTS,
);

export type CartWaFormatoItens = "produto" | "compacto";

export function migrateLegacyMensagemCarrinho(template: string): string | null {
  if (
    normalizeCartWaTemplate(template) ===
    normalizeCartWaTemplate(LEGACY_CART_WA_ENVELOPE)
  ) {
    return DEFAULT_CART_WA_ENVELOPE;
  }
  return null;
}
