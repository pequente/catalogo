import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  containerPreviewWidth,
  matchLarguraPreset,
  matchTipografiaPreset,
} from "@/components/admin/configuracoes/temaPresets";
import {
  expandHexIfComplete,
  normalizeHexForPicker,
} from "@/components/admin/configuracoes/siteTheme";
import {
  siteContainerWidthSchema,
  siteHexColorSchema,
  siteTemaSchema,
} from "@/src/schemas/site-personalization";

describe("siteHexColorSchema", () => {
  it("accepts #RGB, #RGBA, #RRGGBB and #RRGGBBAA", () => {
    assert.equal(siteHexColorSchema.parse("#fff"), "#fff");
    assert.equal(siteHexColorSchema.parse("#25D366"), "#25D366");
    assert.equal(siteHexColorSchema.parse("#e1306c"), "#e1306c");
    assert.equal(siteHexColorSchema.parse("#fff8"), "#fff8");
    assert.equal(siteHexColorSchema.parse("#FFE0E080"), "#FFE0E080");
  });

  it("rejects invalid colors", () => {
    assert.throws(() => siteHexColorSchema.parse("25D366"));
    assert.throws(() => siteHexColorSchema.parse("#gg0000"));
    assert.throws(() => siteHexColorSchema.parse("#12345"));
    assert.throws(() => siteHexColorSchema.parse("green"));
  });
});

describe("siteContainerWidthSchema", () => {
  it("accepts common CSS lengths", () => {
    assert.equal(siteContainerWidthSchema.parse("1120px"), "1120px");
    assert.equal(siteContainerWidthSchema.parse("90%"), "90%");
    assert.equal(siteContainerWidthSchema.parse("70rem"), "70rem");
    assert.equal(siteContainerWidthSchema.parse("960"), "960");
  });

  it("rejects unsafe or empty values", () => {
    assert.throws(() => siteContainerWidthSchema.parse(""));
    assert.throws(() => siteContainerWidthSchema.parse("calc(100%-2rem)"));
    assert.throws(() => siteContainerWidthSchema.parse("1120px;hack"));
    assert.throws(() => siteContainerWidthSchema.parse("wide"));
  });
});

describe("siteTemaSchema", () => {
  it("parses default-like theme", () => {
    const tema = siteTemaSchema.parse({
      raio: 8,
      larguraContainer: "1120px",
      corWhatsapp: "#25D366",
      corInstagram: "#E1306C",
      fonteCorpo: "poppins",
      fonteDisplay: "bebas-neue",
    });
    assert.equal(tema.raio, 8);
    assert.equal(tema.larguraContainer, "1120px");
  });

  it("rejects out-of-range radius", () => {
    assert.throws(() =>
      siteTemaSchema.parse({
        raio: 40,
        larguraContainer: "1120px",
        corWhatsapp: "#25D366",
        corInstagram: "#E1306C",
        fonteCorpo: "poppins",
        fonteDisplay: "bebas-neue",
      }),
    );
  });
});

describe("tema presets helpers", () => {
  it("matches width presets and custom values", () => {
    assert.equal(matchLarguraPreset("1120px"), "padrao");
    assert.equal(matchLarguraPreset("960px"), "compacta");
    assert.equal(matchLarguraPreset("1280px"), "ampla");
    assert.equal(matchLarguraPreset("1000px"), "personalizada");
  });

  it("matches typography presets", () => {
    assert.equal(
      matchTipografiaPreset({
        fonteCorpo: "poppins",
        fonteDisplay: "bebas-neue",
      }),
      "lookbook",
    );
    assert.equal(
      matchTipografiaPreset({
        fonteCorpo: "inter",
        fonteDisplay: "poppins",
      }),
      "moderna",
    );
    assert.equal(
      matchTipografiaPreset({
        fonteCorpo: "system",
        fonteDisplay: "system",
      }),
      "sistema",
    );
    assert.equal(
      matchTipografiaPreset({
        fonteCorpo: "inter",
        fonteDisplay: "bebas-neue",
      }),
      "personalizada",
    );
  });

  it("maps container width into preview percentage", () => {
    assert.equal(containerPreviewWidth("1120px"), "80%");
    assert.equal(containerPreviewWidth("90%"), "90%");
    assert.equal(containerPreviewWidth(""), "100%");
    assert.equal(containerPreviewWidth("nope"), "92%");
  });
});

describe("hex picker helpers", () => {
  it("normalizes and expands hex values", () => {
    assert.equal(normalizeHexForPicker("#ABC"), "#aabbcc");
    assert.equal(normalizeHexForPicker("#25D366"), "#25d366");
    assert.equal(normalizeHexForPicker("#FFE0E080"), "#ffe0e080");
    assert.equal(normalizeHexForPicker("#FF0000FF"), "#ff0000");
    assert.equal(expandHexIfComplete("#abc"), "#AABBCC");
    assert.equal(expandHexIfComplete("#25d366"), "#25D366");
    assert.equal(expandHexIfComplete("#f008"), "#FF000088");
    assert.equal(expandHexIfComplete("#FFE0E080"), "#FFE0E080");
    assert.equal(expandHexIfComplete("nope"), null);
  });
});
