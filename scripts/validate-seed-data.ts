#!/usr/bin/env tsx
/**
 * Validates committed seed under data/ against Zod schemas.
 *
 * Usage:
 *   npm run seed:validate
 *   npm run seed:validate -- --data=data-dev
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bannerSchema } from "@/src/schemas/banner";
import { categorySchema } from "@/src/schemas/category";
import { clientSchema } from "@/src/schemas/client";
import { dailyAnalyticsSchema } from "@/src/schemas/analytics";
import { dashboardCatalogIndexSchema } from "@/src/schemas/dashboard-catalog-index";
import { orderSchema } from "@/src/schemas/order";
import { productSchema } from "@/src/schemas/product";
import { siteConfigSchema } from "@/src/schemas/site-config";
import {
  SITE_CONFIG_TAB_IDS,
  SITE_CONFIG_TAB_SCHEMAS,
  siteConfigMetaSchema,
  composeSiteConfigRaw,
} from "@/src/schemas/site-config-tabs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function parseArgs(argv: string[]): string {
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--data=")) return a.slice("--data=".length);
    if (a === "--data") return argv[++i] ?? "data";
  }
  return "data";
}

async function listJsonFiles(dir: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: string[] = [];
  for (const name of entries) {
    if (!name.endsWith(".json")) continue;
    out.push(path.join(dir, name));
  }
  return out;
}

async function validateDir<T>(
  label: string,
  dir: string,
  schema: { parse: (v: unknown) => T },
): Promise<void> {
  const files = await listJsonFiles(dir);
  for (const file of files) {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
    schema.parse(raw);
  }
  console.log(`OK ${label}: ${files.length} arquivo(s)`);
}

async function main() {
  const dataRoot = path.join(root, parseArgs(process.argv.slice(2)));

  const siteDir = path.join(dataRoot, "configuracoes");
  const metaPath = path.join(siteDir, "meta.json");
  const metaRaw = JSON.parse(await fs.readFile(metaPath, "utf8")) as unknown;
  const meta = siteConfigMetaSchema.parse(metaRaw);
  console.log("OK configuracoes/meta.json");

  const fragments = { meta } as Parameters<typeof composeSiteConfigRaw>[0];
  for (const tab of SITE_CONFIG_TAB_IDS) {
    const fragmentPath = path.join(siteDir, `${tab}.json`);
    const fragmentRaw = JSON.parse(
      await fs.readFile(fragmentPath, "utf8"),
    ) as unknown;
    fragments[tab] = SITE_CONFIG_TAB_SCHEMAS[tab].parse(fragmentRaw) as never;
  }
  console.log(`OK configuracoes/{${SITE_CONFIG_TAB_IDS.join(",")}}.json`);
  siteConfigSchema.parse(composeSiteConfigRaw(fragments));
  console.log("OK composed SiteConfig");

  await validateDir("produtos", path.join(dataRoot, "produtos"), productSchema);
  await validateDir("categorias", path.join(dataRoot, "categorias"), categorySchema);
  await validateDir("banners", path.join(dataRoot, "banners"), bannerSchema);
  await validateDir("pedidos", path.join(dataRoot, "pedidos"), orderSchema);
  await validateDir("clientes", path.join(dataRoot, "clientes"), clientSchema);

  const analyticsDir = path.join(dataRoot, "analytics/daily");
  const analyticsFiles = await listJsonFiles(analyticsDir);
  for (const file of analyticsFiles) {
    const raw = JSON.parse(await fs.readFile(file, "utf8")) as unknown;
    dailyAnalyticsSchema.parse(raw);
  }
  console.log(`OK analytics/daily: ${analyticsFiles.length} arquivo(s)`);

  const dashPath = path.join(dataRoot, "indices/dashboard-catalogo.json");
  const dashRaw = JSON.parse(await fs.readFile(dashPath, "utf8")) as unknown;
  dashboardCatalogIndexSchema.parse(dashRaw);
  console.log("OK indices/dashboard-catalogo.json");

  console.log(`Seed validado em ${dataRoot}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
