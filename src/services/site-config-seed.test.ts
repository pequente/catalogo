import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { siteConfigSchema } from "@/src/schemas/site-config";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import {
  SITE_CONFIG_TAB_IDS,
  SITE_CONFIG_TAB_PATHS,
  SITE_CONFIG_META_PATH,
  SITE_CONFIG_TAB_SCHEMAS,
  composeSiteConfigRaw,
  siteConfigMetaSchema,
  splitSiteConfig,
  type SiteConfigFragments,
} from "@/src/schemas/site-config-tabs";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const dataRoot = path.join(repoRoot, "data");

function readFragments(): SiteConfigFragments {
  const meta = siteConfigMetaSchema.parse(
    JSON.parse(
      readFileSync(path.join(dataRoot, SITE_CONFIG_META_PATH), "utf8"),
    ) as unknown,
  );
  const fragments = { meta } as SiteConfigFragments;
  for (const tab of SITE_CONFIG_TAB_IDS) {
    fragments[tab] = SITE_CONFIG_TAB_SCHEMAS[tab].parse(
      JSON.parse(
        readFileSync(path.join(dataRoot, SITE_CONFIG_TAB_PATHS[tab]), "utf8"),
      ) as unknown,
    ) as never;
  }
  return fragments;
}

function stripVolatile(config: ReturnType<typeof siteConfigSchema.parse>) {
  const copy = { ...config };
  delete (copy as { atualizadoEm?: string }).atualizadoEm;
  return copy;
}

describe("seed site config fragments vs DEFAULT_SITE_CONFIG", () => {
  it("parses composed fragments with siteConfigSchema", () => {
    const parsed = siteConfigSchema.parse(
      composeSiteConfigRaw(readFragments()),
    );
    assert.equal(parsed.versao, 1);
    assert.ok(parsed.nomeLoja.length >= 1);
  });

  it("matches DEFAULT_SITE_CONFIG except atualizadoEm", () => {
    const fromFile = siteConfigSchema.parse(
      composeSiteConfigRaw(readFragments()),
    );
    const fromDefault = siteConfigSchema.parse({
      ...DEFAULT_SITE_CONFIG,
      atualizadoEm: fromFile.atualizadoEm,
    });
    assert.deepEqual(stripVolatile(fromFile), stripVolatile(fromDefault));
  });

  it("split/compose round-trips DEFAULT_SITE_CONFIG", () => {
    const split = splitSiteConfig(DEFAULT_SITE_CONFIG);
    const again = siteConfigSchema.parse(composeSiteConfigRaw(split));
    assert.deepEqual(stripVolatile(again), stripVolatile(DEFAULT_SITE_CONFIG));
  });
});
