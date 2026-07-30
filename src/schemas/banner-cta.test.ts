import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  bannerCreateSchema,
  bannerUpdateSchema,
} from "@/src/schemas/banner";
import {
  bannerCtaTexto,
  bannerHref,
} from "@/src/lib/front/media";
import { DEFAULT_BANNER_CTA } from "@/src/config/store-copy-defaults";

const baseImage = {
  id: "11111111-1111-4111-8111-111111111111",
  path: "imagens/banners/11111111-1111-4111-8111-111111111111.jpg",
  alt: "Topo",
};

describe("banner href/cta schemas", () => {
  it("accepts relative and absolute href on create", () => {
    const relative = bannerCreateSchema.parse({
      posicao: "hero",
      imagem: baseImage,
      href: "/catalogo",
      ctaTexto: "Ver ofertas",
    });
    assert.equal(relative.href, "/catalogo");
    assert.equal(relative.ctaTexto, "Ver ofertas");

    const absolute = bannerCreateSchema.parse({
      posicao: "promo",
      imagem: baseImage,
      href: "https://exemplo.com/promo",
    });
    assert.equal(absolute.href, "https://exemplo.com/promo");
    assert.equal(absolute.ctaTexto, null);
  });

  it("rejects invalid href", () => {
    assert.throws(() =>
      bannerCreateSchema.parse({
        posicao: "faixa",
        imagem: baseImage,
        href: "catalogo-sem-barra",
      }),
    );
  });

  it("clears href and ctaTexto on update when empty or null", () => {
    const cleared = bannerUpdateSchema.parse({
      versao: 2,
      href: "",
      ctaTexto: null,
    });
    assert.equal(cleared.href, null);
    assert.equal(cleared.ctaTexto, null);

    const omitted = bannerUpdateSchema.parse({ versao: 3 });
    assert.equal(omitted.href, undefined);
    assert.equal(omitted.ctaTexto, undefined);
  });
});

describe("bannerHref / bannerCtaTexto helpers", () => {
  it("falls back to catalog and default CTA", () => {
    assert.equal(bannerHref(undefined), "/catalogo");
    assert.equal(bannerHref({ href: "  " }), "/catalogo");
    assert.equal(bannerHref({ href: "/promocoes" }), "/promocoes");

    assert.equal(bannerCtaTexto(undefined), DEFAULT_BANNER_CTA);
    assert.equal(bannerCtaTexto({ ctaTexto: "" }), DEFAULT_BANNER_CTA);
    assert.equal(
      bannerCtaTexto({ ctaTexto: "Comprar agora" }, "Ver coleção"),
      "Comprar agora",
    );
    assert.equal(bannerCtaTexto(undefined, "Ver coleção"), "Ver coleção");
  });
});
