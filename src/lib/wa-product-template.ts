export type ProductWaTemplateParts = {
  intro: string;
  includeVariantDetails: boolean;
  includeUrl: boolean;
  outro: string;
};

/** Fixed punctuation after the product name line (not user-configurable). */
export const PRODUCT_WA_SUFFIX_AFTER_NAME = ":";

export const DEFAULT_PRODUCT_WA_TEMPLATE_PARTS: ProductWaTemplateParts = {
  intro: "Tenho interesse no produto",
  includeVariantDetails: true,
  includeUrl: true,
  outro: "Segue disponível?",
};

/** Previous default before nested-bullet layout (for migration). */
export const LEGACY_DEFAULT_MENSAGEM_PRODUTO =
  "Tenho interesse no produto {nome}:\n- {resumo}\n- {url}\n\nSegue disponível?";

export function buildProductWaTemplate(parts: ProductWaTemplateParts): string {
  const heading = parts.intro.trim();
  let msg = `*${heading}:*\n- {nome}${PRODUCT_WA_SUFFIX_AFTER_NAME}`;
  if (parts.includeVariantDetails) {
    msg += "\n- - {resumo}";
  }
  if (parts.includeUrl) {
    msg += "\n- - {url}";
  }
  const outro = parts.outro.trim();
  if (outro) {
    msg += `\n\n${outro}`;
  }
  return msg;
}

export const DEFAULT_PRODUCT_WA_TEMPLATE = buildProductWaTemplate(
  DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
);

/** Item lines only (no heading / outro) — used for cart multi-product lists. */
export function buildProductWaItemBlockTemplate(
  parts: ProductWaTemplateParts,
): string {
  let msg = `- {nome}${PRODUCT_WA_SUFFIX_AFTER_NAME}`;
  if (parts.includeVariantDetails) {
    msg += "\n- - {resumo}";
  }
  if (parts.includeUrl) {
    msg += "\n- - {url}";
  }
  return msg;
}

/** WhatsApp bold heading; pluralizes "no produto" → "nos produtos" when itemCount > 1. */
export function productInterestHeading(intro: string, itemCount: number): string {
  let text = intro.trim();
  if (itemCount > 1) {
    text = text.replace(/\bno produto\b/i, "nos produtos");
  }
  return `*${text}:*`;
}

function parseNewProductWaTemplate(t: string): ProductWaTemplateParts | null {
  const headingMatch = t.match(/^\*([^*\n]+):\*\n/);
  if (!headingMatch) return null;

  const intro = headingMatch[1].trim();
  let rest = t.slice(headingMatch[0].length);

  const nomeLineMatch = rest.match(/^- \{nome\}(.*?)(\n|$)/);
  if (!nomeLineMatch) return null;

  rest = rest.slice(nomeLineMatch[0].length);

  const includeVariantDetails = /(^|\n)- - \{resumo\}[ \t]*($|\n)/.test(t);
  const includeUrl = /(^|\n)- - \{url\}[ \t]*($|\n)/.test(t);

  const outro = rest
    .replace(/^[ \t]*- - \{resumo\}[ \t]*\n?/m, "")
    .replace(/^[ \t]*- - \{url\}[ \t]*\n?/m, "")
    .trim();

  return {
    intro,
    includeVariantDetails,
    includeUrl,
    outro,
  };
}

function parseLegacyProductWaTemplate(t: string): ProductWaTemplateParts | null {
  const nomeToken = "{nome}";
  const idx = t.indexOf(nomeToken);
  if (idx === -1) return null;

  const intro = t.slice(0, idx).trim();
  let rest = t.slice(idx + nomeToken.length);

  const nl = rest.indexOf("\n");
  rest = nl === -1 ? "" : rest.slice(nl + 1);

  const includeVariantDetails =
    /(^|\n)[ \t]*-[ \t]*\{resumo\}[ \t]*($|\n)/.test(t);
  const includeUrl = /(^|\n)[ \t]*-[ \t]*\{url\}[ \t]*($|\n)/.test(t);

  const outro = rest
    .replace(/^[ \t]*-[ \t]*\{resumo\}[ \t]*\n?/m, "")
    .replace(/^[ \t]*-[ \t]*\{url\}[ \t]*\n?/m, "")
    .trim();

  return {
    intro,
    includeVariantDetails,
    includeUrl,
    outro,
  };
}

export function parseProductWaTemplate(
  template: string,
): ProductWaTemplateParts | null {
  const t = template.replace(/\r\n/g, "\n");
  return parseNewProductWaTemplate(t) ?? parseLegacyProductWaTemplate(t);
}

function normalizeProductWaTemplate(template: string): string {
  return template.replace(/\r\n/g, "\n").trim();
}

/** True when the template matches the structured editor format. */
export function isRecognizedProductWaTemplate(template: string): boolean {
  const parts = parseProductWaTemplate(template);
  if (!parts) return false;
  return (
    normalizeProductWaTemplate(buildProductWaTemplate(parts)) ===
    normalizeProductWaTemplate(template)
  );
}

export function migrateLegacyMensagemProduto(template: string): string | null {
  if (normalizeProductWaTemplate(template) === normalizeProductWaTemplate(LEGACY_DEFAULT_MENSAGEM_PRODUTO)) {
    return DEFAULT_PRODUCT_WA_TEMPLATE;
  }
  return null;
}
