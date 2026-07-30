import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildProductWaTemplate,
  DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
} from "./wa-product-template.ts";
import { buildCartWaTemplate } from "./wa-cart-template.ts";
import {
  buildCompactCartItemTemplate,
  DEFAULT_COMPACT_CART_ITEM_PARTS,
  parseCompactCartItemTemplate,
} from "./wa-compact-template.ts";
import { normalizeWhatsappTemplates } from "./wa-whatsapp-normalize.ts";
import { productWaTemplatePartsSchema } from "./wa-template-validation.ts";

describe("wa template parts round-trip", () => {
  it("buildProductWaTemplate round-trips structured parts", () => {
    const built = buildProductWaTemplate(DEFAULT_PRODUCT_WA_TEMPLATE_PARTS);
    assert.match(built, /\{nome\}/);
    assert.match(built, /\{resumo\}/);
  });

  it("buildCartWaTemplate always includes {itens} internally", () => {
    const built = buildCartWaTemplate({
      beforeItens: "Olá",
      outro: "Tchau",
    });
    assert.equal(built, "Olá\n\n{itens}\n\nTchau");
  });

  it("compact template always includes {nome}", () => {
    const tpl = buildCompactCartItemTemplate(DEFAULT_COMPACT_CART_ITEM_PARTS);
    assert.match(tpl, /\{nome\}/);
  });

  it("parseCompactCartItemTemplate recognizes default legacy string", () => {
    const parts = parseCompactCartItemTemplate(
      "• {nome} — {resumo} (x{quantidade})",
    );
    assert.equal(parts.bullet, "•");
    assert.equal(parts.showResumo, true);
  });
});

describe("normalizeWhatsappTemplates", () => {
  it("migrates legacy string fields to parts", () => {
    const normalized = normalizeWhatsappTemplates({
      telefone: "16999999999",
      mensagemProduto:
        "*Tenho interesse no produto:*\n- {nome}:\n- - {resumo}\n- - {url}\n\nSegue disponível?",
      mensagemCarrinho:
        "Gostaria de pedir os itens abaixo:\n\n{itens}\n\nPodem me confirmar?",
      mensagemCarrinhoItemCompacto: "• {nome} — {resumo} (x{quantidade})",
    });
    assert.equal(
      normalized.mensagemProdutoParts.intro,
      "Tenho interesse no produto",
    );
    assert.equal(
      normalized.mensagemCarrinhoParts.beforeItens,
      "Gostaria de pedir os itens abaixo:",
    );
    assert.equal(normalized.mensagemCarrinhoItemCompactoParts.showResumo, true);
    assert.equal(
      (normalized as { mensagemProduto?: string }).mensagemProduto,
      undefined,
    );
  });

  it("migrates legacy showReferenciaSeparada into mensagemProdutoIncluirReferencia", () => {
    const normalized = normalizeWhatsappTemplates({
      telefone: "16999999999",
      mensagemProdutoIncluirReferencia: false,
      mensagemProdutoItemCompactoParts: {
        bullet: "•",
        showResumo: true,
        showUrl: false,
        showReferenciaSeparada: true,
      },
    });
    assert.equal(normalized.mensagemProdutoIncluirReferencia, true);
    assert.equal(
      (
        normalized.mensagemProdutoItemCompactoParts as {
          showReferenciaSeparada?: boolean;
        }
      ).showReferenciaSeparada,
      undefined,
    );
  });
});

describe("productWaTemplatePartsSchema", () => {
  it("rejects placeholders in user text fields", () => {
    const result = productWaTemplatePartsSchema.safeParse({
      ...DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
      outro: "Olá {nome}",
    });
    assert.equal(result.success, false);
  });
});
