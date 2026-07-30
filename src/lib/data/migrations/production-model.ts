/**
 * Production catalog model (pre–personalização extendida / variantes atributos / WA parts).
 *
 * Reference snapshot: `data-dev/` after `dev:restore:data` from a production fork — e.g.
 * - `produtos/*.json`: `variantes[].tamanho` + `cor` (sem `atributos`)
 * - `configuracoes/site.json`: `textos` só `sobre`/`trocas`; sem `rotulos`, `vitrine`, `tema`, `seo`;
 *   WhatsApp com `mensagemProduto` / `mensagemCarrinho` string (sem `*Parts`)
 */
import { migrateProductDocument } from "@/src/schemas/product";
import {
  migrateSiteConfigInput,
  siteConfigSchema,
} from "@/src/schemas/site-config";

export function applyProductionBaselineToProduct(raw: unknown): unknown {
  return migrateProductDocument(raw);
}

export function applyProductionBaselineToSite(raw: unknown): unknown {
  const lifted = migrateSiteConfigInput(raw);
  const parsed = siteConfigSchema.safeParse(lifted);
  if (!parsed.success) {
    throw new Error(
      `[migrations] site.json: ${JSON.stringify(parsed.error.flatten())}`,
    );
  }
  return parsed.data;
}
