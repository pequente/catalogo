import { z } from "zod";
import { productSchema } from "@/src/schemas/product";
import { siteConfigSchema } from "@/src/schemas/site-config";
import {
  SITE_CONFIG_META_PATH,
  SITE_CONFIG_TAB_PATHS,
  siteConfigMetaSchema,
  SITE_CONFIG_TAB_SCHEMAS,
  type SiteConfigTabId,
} from "@/src/schemas/site-config-tabs";
import { categorySchema } from "@/src/schemas/category";
import { clientSchema } from "@/src/schemas/client";
import { orderSchema } from "@/src/schemas/order";
import { bannerSchema } from "@/src/schemas/banner";

type Validator = z.ZodType;

function validatorForPath(relativePath: string): Validator | null {
  const posix = relativePath.replace(/\\/g, "/");
  if (posix === "configuracoes/site.json") return siteConfigSchema;
  if (posix === SITE_CONFIG_META_PATH) return siteConfigMetaSchema;
  for (const [tab, path] of Object.entries(SITE_CONFIG_TAB_PATHS) as Array<
    [SiteConfigTabId, string]
  >) {
    if (posix === path) return SITE_CONFIG_TAB_SCHEMAS[tab];
  }
  if (posix === "configuracoes/migrations.json") return null;
  if (posix.startsWith("produtos/") && posix.endsWith(".json")) {
    return productSchema;
  }
  if (posix.startsWith("categorias/") && posix.endsWith(".json")) {
    return categorySchema;
  }
  if (posix.startsWith("clientes/") && posix.endsWith(".json")) {
    return clientSchema;
  }
  if (posix.startsWith("pedidos/") && posix.endsWith(".json")) {
    return orderSchema;
  }
  if (posix.startsWith("banners/") && posix.endsWith(".json")) {
    return bannerSchema;
  }
  if (posix.startsWith("indices/")) return null;
  if (posix.startsWith("analytics/")) return null;
  return null;
}

export function validateMigrationFileChange(
  relativePath: string,
  content: string | Buffer,
): void {
  const validator = validatorForPath(relativePath);
  if (!validator) return;

  const text = Buffer.isBuffer(content) ? content.toString("utf8") : content;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(
      `[migrations] ${relativePath}: invalid JSON (${e instanceof Error ? e.message : e})`,
    );
  }

  const result = validator.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `[migrations] ${relativePath}: schema validation failed: ${JSON.stringify(result.error.flatten())}`,
    );
  }
}
