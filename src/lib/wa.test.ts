import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cartWaMessage,
  formatCartItemMessage,
  fillProductWaTokens,
  productWaMessage,
  productWaMessageFromParts,
} from "./wa.ts";
import { DEFAULT_PRODUCT_WA_TEMPLATE_PARTS } from "./wa-product-template.ts";
import { DEFAULT_CART_WA_TEMPLATE_PARTS } from "./wa-cart-template.ts";
import { DEFAULT_COMPACT_CART_ITEM_PARTS } from "./wa-compact-template.ts";

describe("productWaMessage referencia", () => {
  const template = "*Interesse:*\n- {nome}:\n- - {resumo}";

  it("keeps plain nome when flag is off", () => {
    const msg = productWaMessage(template, "Vestido", "vestido", {
      referencia: "12425",
      mensagemProdutoIncluirReferencia: false,
    });
    assert.match(msg, /- Vestido:/);
    assert.doesNotMatch(msg, /Ref\./);
  });

  it("appends ref to nome when flag is on", () => {
    const msg = productWaMessage(template, "Vestido", "vestido", {
      referencia: "12425",
      mensagemProdutoIncluirReferencia: true,
    });
    assert.match(msg, /- Vestido \(Ref\. 12425\):/);
  });

  it("exposes {referencia} token in system templates", () => {
    const msg = productWaMessage("Cód. {referencia}", "X", "x", {
      referencia: " ABC ",
    });
    assert.equal(msg, "Cód. ABC");
  });

  it("compact product line includes ref once when flag is on", () => {
    const msg = productWaMessageFromParts(
      DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
      "Vestido",
      "vestido",
      {
        formatoItens: "compacto",
        itemCompactoParts: {
          ...DEFAULT_COMPACT_CART_ITEM_PARTS,
          showResumo: false,
        },
        referencia: "12425",
        mensagemProdutoIncluirReferencia: true,
      },
    );
    assert.match(msg, /• Vestido \(Ref\. 12425\)/);
    assert.doesNotMatch(msg, /\(Ref\. 12425\) \(Ref\./);
  });

  it("compact cart line respects incluir referencia flag", () => {
    const line = {
      nome: "Vestido",
      slug: "vestido",
      referencia: "99",
      quantidade: 1,
    };
    const baseConfig = {
      mensagemProdutoParts: DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
      mensagemCarrinhoParts: DEFAULT_CART_WA_TEMPLATE_PARTS,
      mensagemCarrinhoItemCompactoParts: {
        ...DEFAULT_COMPACT_CART_ITEM_PARTS,
        showResumo: false,
      },
      mensagemCarrinhoFormatoItens: "compacto" as const,
    };
    const off = formatCartItemMessage(
      { ...baseConfig, mensagemProdutoIncluirReferencia: false },
      line,
    );
    assert.match(off, /• Vestido/);
    assert.doesNotMatch(off, /Ref\./);

    const on = formatCartItemMessage(
      { ...baseConfig, mensagemProdutoIncluirReferencia: true },
      line,
    );
    assert.match(on, /• Vestido \(Ref\. 99\)/);
  });

  it("cart produto format passes referencia per line", () => {
    const msg = cartWaMessage(
      {
        mensagemCarrinhoParts: { beforeItens: "", outro: "Ok?" },
        mensagemCarrinhoFormatoItens: "produto",
        mensagemCarrinhoItemCompactoParts: DEFAULT_COMPACT_CART_ITEM_PARTS,
        mensagemProdutoParts: {
          intro: "Interesse",
          includeVariantDetails: true,
          includeUrl: true,
          outro: "",
        },
        mensagemProdutoIncluirReferencia: true,
      },
      [
        {
          nome: "A",
          slug: "a",
          referencia: "1",
          quantidade: 1,
        },
      ],
      "https://loja.test",
    );
    assert.match(msg, /A \(Ref\. 1\)/);
    assert.match(msg, /Ok\?/);
  });
});

describe("productWaMessageFromParts segmented assembly", () => {
  it("does not substitute tokens in outro", () => {
    const msg = productWaMessageFromParts(
      {
        intro: "Interesse",
        includeVariantDetails: false,
        includeUrl: false,
        outro: "Confirma {nome}?",
      },
      "Vestido",
      "vestido",
    );
    assert.match(msg, /Confirma \{nome\}\?/);
    assert.doesNotMatch(msg, /Confirma Vestido/);
  });

  it("fillProductWaTokens fills system block only", () => {
    const filled = fillProductWaTokens("- {nome}:", "A", "a", {});
    assert.match(filled, /- A:/);
  });

  it("uses compact line when formatoItens is compacto", () => {
    const msg = productWaMessageFromParts(
      {
        intro: "Interesse",
        includeVariantDetails: true,
        includeUrl: true,
        outro: "",
      },
      "Vestido",
      "vestido",
      {
        formatoItens: "compacto",
        itemCompactoParts: {
          ...DEFAULT_COMPACT_CART_ITEM_PARTS,
          showUrl: false,
        },
        tamanho: "M",
        cor: "Azul",
      },
    );
    assert.match(msg, /^\*Interesse:\*/);
    assert.match(msg, /• Vestido — Tamanho: M/);
    assert.doesNotMatch(msg, /^- Vestido:/m);
  });
});
