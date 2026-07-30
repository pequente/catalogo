import { z } from "zod";
import type { ProductIndexEntry } from "@/src/schemas/product-index";

/** Bump when dashboard catalog aggregate shape changes incompatibly. */
export const DASHBOARD_CATALOG_SCHEMA_VERSION = 2 as const;

/**
 * Precomputed catalog KPIs for the admin dashboard (Fase 4).
 * Written atomically with product index mutations — one small JSON read,
 * not a reduce over every index entry on each dashboard miss.
 */
export const dashboardCatalogIndexSchema = z.object({
  schemaVersion: z.literal(DASHBOARD_CATALOG_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  produtos: z.number().int().min(0),
  ativos: z.number().int().min(0),
  ocultos: z.number().int().min(0),
  esgotados: z.number().int().min(0),
  unidadesEstoque: z.number().int().min(0),
  /** Products that have variantes but zero total stock. */
  produtosEstoqueZero: z.number().int().min(0),
  destaques: z.number().int().min(0),
  lancamentos: z.number().int().min(0),
  /** Products with a promotional price set. */
  comPromocao: z.number().int().min(0),
  /** Products without a cover image. */
  semCapa: z.number().int().min(0),
});

export type DashboardCatalogIndex = z.infer<typeof dashboardCatalogIndexSchema>;

/** Pure reduce over lean index entries — used at write time and in tests. */
export function computeDashboardCatalogFromEntries(
  entries: readonly ProductIndexEntry[],
  updatedAt = new Date().toISOString(),
): DashboardCatalogIndex {
  let ativos = 0;
  let ocultos = 0;
  let esgotados = 0;
  let unidadesEstoque = 0;
  let produtosEstoqueZero = 0;
  let destaques = 0;
  let lancamentos = 0;
  let comPromocao = 0;
  let semCapa = 0;

  for (const p of entries) {
    if (p.status === "ativo") ativos += 1;
    else if (p.status === "oculto") ocultos += 1;
    else if (p.status === "esgotado") esgotados += 1;

    unidadesEstoque += p.estoqueTotal;
    if (p.variantesCount > 0 && p.estoqueTotal <= 0) {
      produtosEstoqueZero += 1;
    }
    if (p.destaque) destaques += 1;
    if (p.lancamento) lancamentos += 1;
    if (p.precoPromocional != null) comPromocao += 1;
    if (p.capa == null) semCapa += 1;
  }

  return {
    schemaVersion: DASHBOARD_CATALOG_SCHEMA_VERSION,
    updatedAt,
    produtos: entries.length,
    ativos,
    ocultos,
    esgotados,
    unidadesEstoque,
    produtosEstoqueZero,
    destaques,
    lancamentos,
    comPromocao,
    semCapa,
  };
}

export function emptyDashboardCatalogIndex(
  updatedAt = new Date().toISOString(),
): DashboardCatalogIndex {
  return computeDashboardCatalogFromEntries([], updatedAt);
}
