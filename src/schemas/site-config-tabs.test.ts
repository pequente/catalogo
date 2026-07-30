import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import { siteConfigSchema } from "@/src/schemas/site-config";
import {
  SITE_CONFIG_TAB_IDS,
  composeSiteConfigRaw,
  extractTabSlice,
  mergeTabIntoConfig,
  pickSiteConfigSource,
  siteConfigTabsToPersist,
  splitSiteConfig,
} from "@/src/schemas/site-config-tabs";

function stripVolatile(config: ReturnType<typeof siteConfigSchema.parse>) {
  const copy = { ...config };
  delete (copy as { atualizadoEm?: string }).atualizadoEm;
  return copy;
}

describe("site-config-tabs compose/split", () => {
  it("round-trips DEFAULT_SITE_CONFIG", () => {
    const split = splitSiteConfig(DEFAULT_SITE_CONFIG);
    const again = siteConfigSchema.parse(composeSiteConfigRaw(split));
    assert.deepEqual(stripVolatile(again), stripVolatile(DEFAULT_SITE_CONFIG));
  });

  it("extract + merge preserves each tab slice", () => {
    let config = DEFAULT_SITE_CONFIG;
    for (const tab of SITE_CONFIG_TAB_IDS) {
      const slice = extractTabSlice(config, tab);
      config = mergeTabIntoConfig(config, tab, slice);
    }
    assert.deepEqual(
      stripVolatile(siteConfigSchema.parse(config)),
      stripVolatile(DEFAULT_SITE_CONFIG),
    );
  });

  it("reads legacy Sobre/Trocas from Contato and writes them under Textos", () => {
    const fragments = splitSiteConfig(DEFAULT_SITE_CONFIG);
    fragments.contato.textos = {
      sobre: "História preservada",
      trocas: "Política preservada",
    };
    delete fragments.textos.textos.sobre;
    delete fragments.textos.textos.trocas;

    const legacy = siteConfigSchema.parse(composeSiteConfigRaw(fragments));
    assert.equal(legacy.textos.sobre, "História preservada");
    assert.equal(legacy.textos.trocas, "Política preservada");

    const migrated = splitSiteConfig(legacy);
    assert.equal(migrated.contato.textos, undefined);
    assert.equal(migrated.textos.textos.sobre, "História preservada");
    assert.equal(migrated.textos.textos.trocas, "Política preservada");
  });

  it("mergeTabIntoConfig updates versao from meta", () => {
    const next = mergeTabIntoConfig(
      DEFAULT_SITE_CONFIG,
      "geral",
      {
        ...extractTabSlice(DEFAULT_SITE_CONFIG, "geral"),
        metaReceitaMensal: 1000,
      },
      { versao: 9, atualizadoEm: "2026-07-01T00:00:00.000Z" },
    );
    assert.equal(next.versao, 9);
    assert.equal(next.metaReceitaMensal, 1000);
  });

  it("preserves meta.versao when compose falls back to defaults", () => {
    const fragments = splitSiteConfig(DEFAULT_SITE_CONFIG);
    fragments.meta = {
      versao: 42,
      atualizadoEm: "2026-07-28T12:00:00.000Z",
    };
    // Corrupt geral so composeSiteConfigRaw fails siteConfigSchema.
    (fragments.geral as { nomeLoja: string }).nomeLoja = "";
    const picked = pickSiteConfigSource({ legacy: null, fragments });
    assert.equal(picked.versao, 42);
    assert.equal(picked.atualizadoEm, "2026-07-28T12:00:00.000Z");
  });
});

describe("pickSiteConfigSource", () => {
  it("prefers fragments when both legacy and fragments exist", () => {
    const legacy = {
      ...DEFAULT_SITE_CONFIG,
      nomeLoja: "Loja do fork",
      versao: 7,
    };
    const fragments = splitSiteConfig({
      ...DEFAULT_SITE_CONFIG,
      nomeLoja: "Só fragmentos",
      versao: 3,
    });
    const picked = pickSiteConfigSource({ legacy, fragments });
    assert.equal(picked.nomeLoja, "Só fragmentos");
    assert.equal(picked.versao, 3);
  });

  it("uses fragments when legacy is absent", () => {
    const fragments = splitSiteConfig({
      ...DEFAULT_SITE_CONFIG,
      nomeLoja: "Só fragmentos",
    });
    const picked = pickSiteConfigSource({ legacy: null, fragments });
    assert.equal(picked.nomeLoja, "Só fragmentos");
  });

  it("uses legacy when fragments are absent", () => {
    const legacy = {
      ...DEFAULT_SITE_CONFIG,
      nomeLoja: "Só legado",
      versao: 4,
    };
    const picked = pickSiteConfigSource({ legacy, fragments: null });
    assert.equal(picked.nomeLoja, "Só legado");
    assert.equal(picked.versao, 4);
  });

  it("falls back to defaults when neither source exists", () => {
    const picked = pickSiteConfigSource({ legacy: null, fragments: null });
    assert.equal(picked.nomeLoja, DEFAULT_SITE_CONFIG.nomeLoja);
  });

  it("lifts legacy painel.metaReceitaMensal into root on parse", () => {
    const parsed = siteConfigSchema.parse({
      ...DEFAULT_SITE_CONFIG,
      painel: { metaReceitaMensal: 2500 },
    });
    assert.equal(parsed.metaReceitaMensal, 2500);
    assert.equal(
      (parsed as { painel?: unknown }).painel,
      undefined,
    );
  });
});

describe("siteConfigTabsToPersist", () => {
  it("writes only touched tabs when storage is complete", () => {
    const tabs = siteConfigTabsToPersist(["geral"], []);
    assert.deepEqual(tabs, ["geral"]);
  });

  it("heals missing tabs alongside the patched tab without listing valid siblings", () => {
    const missing = SITE_CONFIG_TAB_IDS.filter((t) => t !== "geral");
    const tabs = siteConfigTabsToPersist(["geral"], missing);
    assert.ok(tabs.includes("geral"));
    for (const t of missing) assert.ok(tabs.includes(t));
    assert.equal(tabs.length, SITE_CONFIG_TAB_IDS.length);
  });

  it("does not duplicate a tab that is both touched and fallback", () => {
    const tabs = siteConfigTabsToPersist(["whatsapp"], ["whatsapp", "tema"]);
    assert.deepEqual(tabs, ["whatsapp", "tema"]);
  });
});
