import "server-only";
import { unstable_cache } from "next/cache";
import {
  addDaysDateOnly,
  dateInSaoPaulo,
  parseDateOnly,
  periodBoundsIso,
  startOfMonthDateOnly,
} from "@/src/lib/analytics-date";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import {
  buildCadastrosSeries,
  buildCanalDetalhe,
  buildClientContactMix,
  buildDailySeries,
  buildFunil,
  buildMixVariantes,
  buildNegocioRecentes,
  buildPorDiaSemana,
  buildPorHora,
  buildTopCategorias,
  buildTopClientesPorReceita,
  buildTopProdutosByQty,
  buildTopProdutosByRevenue,
  comparisonMetric,
  computeMetaProgress,
  computeNegocioCore,
  countConfirmedOrdersByClient,
  countClientesRecorrentes,
  filterOrdersInPeriod,
  previousPeriodBounds,
  type DashboardProductRef,
} from "@/src/lib/dashboard-aggregates";
import {
  getDailyRange,
  mergeDailyPublic,
} from "@/src/services/analytics.service";
import { listBanners } from "@/src/services/banners.service";
import { listCategories } from "@/src/services/categories.service";
import { getOrderIndexState } from "@/src/lib/indices/order-index-io";
import { getClientIndexState } from "@/src/lib/indices/client-index-io";
import { indexEntryToOrder } from "@/src/schemas/order-index";
import { indexEntryToClient } from "@/src/schemas/client-index";
import { getProductIndexState } from "@/src/lib/indices/product-index-io";
import { getDashboardCatalogIndex } from "@/src/lib/indices/dashboard-catalog-io";
import { getSiteConfig } from "@/src/services/site-config.service";
import type {
  DashboardPeriodPreset,
  DashboardStats,
} from "@/src/schemas/dashboard";

export type { DashboardPeriodPreset, DashboardStats };

const DASHBOARD_REVALIDATE = 60;

function topEntries(
  map: Record<string, number>,
  limit: number,
): Array<{ key: string; count: number }> {
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

function resolvePeriod(
  from?: string,
  to?: string,
): { from: string; to: string } {
  const today = dateInSaoPaulo();
  if (from && to && parseDateOnly(from) && parseDateOnly(to) && from <= to) {
    return { from, to };
  }
  return {
    from: addDaysDateOnly(today, -6),
    to: today,
  };
}

export function periodForPreset(
  preset: DashboardPeriodPreset,
  customFrom?: string,
  customTo?: string,
): { from: string; to: string } {
  const today = dateInSaoPaulo();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDaysDateOnly(today, -6), to: today };
    case "30d":
      return { from: addDaysDateOnly(today, -29), to: today };
    case "month":
      return { from: startOfMonthDateOnly(today), to: today };
    case "custom":
      return resolvePeriod(customFrom, customTo);
    default:
      return { from: addDaysDateOnly(today, -6), to: today };
  }
}

async function computeDashboardStats(
  from: string,
  to: string,
): Promise<DashboardStats> {
  const bounds = periodBoundsIso(from, to);
  if (!bounds) {
    throw new Error("Período inválido");
  }
  const { startIso, endIso } = bounds;

  const [
    catalogAgg,
    banners,
    orderIndex,
    categories,
    clientIndex,
    dailyRows,
    siteConfig,
  ] = await Promise.all([
    getDashboardCatalogIndex(),
    listBanners({ onlyActive: true }),
    getOrderIndexState(),
    listCategories(),
    getClientIndexState(),
    getDailyRange(from, to),
    getSiteConfig(),
  ]);

  const orders = orderIndex.entries.map(indexEntryToOrder);
  const clients = clientIndex.entries.map(indexEntryToClient);

  const periodOrders = filterOrdersInPeriod(orders, startIso, endIso);
  const confirmed = periodOrders.filter((o) => o.status === "confirmado");
  const core = computeNegocioCore(periodOrders);

  const prevBounds = previousPeriodBounds(from, to);
  const prevPeriodBounds = periodBoundsIso(prevBounds.from, prevBounds.to);
  const prevOrders = prevPeriodBounds
    ? filterOrdersInPeriod(
        orders,
        prevPeriodBounds.startIso,
        prevPeriodBounds.endIso,
      )
    : [];
  const prevCore = computeNegocioCore(prevOrders);

  // Collect product ids needed for name/categoria resolution (orders + WA),
  // then resolve only those refs from the product index — not a full KPI scan.
  const neededProductIds = new Set<string>();
  for (const order of confirmed) {
    for (const item of order.itens) {
      neededProductIds.add(item.produtoId);
    }
  }
  const usabilityMergedEarly = mergeDailyPublic(dailyRows);
  for (const produtoId of Object.keys(usabilityMergedEarly.waByProdutoId)) {
    neededProductIds.add(produtoId);
  }

  const productById = new Map<string, DashboardProductRef>();
  if (neededProductIds.size > 0) {
    const productIndex = await getProductIndexState();
    for (const entry of productIndex.entries) {
      if (!neededProductIds.has(entry.id)) continue;
      productById.set(entry.id, {
        id: entry.id,
        nome: entry.nome,
        categoriasIds: entry.categoriasIds,
      });
    }
  }

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const clientById = new Map(clients.map((c) => [c.id, c]));

  const series = buildDailySeries(from, to, confirmed);
  const serieCanal = {
    whatsapp: buildDailySeries(from, to, confirmed, "whatsapp"),
    loja_fisica: buildDailySeries(from, to, confirmed, "loja_fisica"),
  };

  const topProdutos = buildTopProdutosByQty(confirmed, productById, 8);
  const negocioTopProdutos = buildTopProdutosByRevenue(
    confirmed,
    productById,
    8,
  );
  const negocioTopCategorias = buildTopCategorias(
    confirmed,
    productById,
    categoryById,
    8,
  );

  const periodClients = clients.filter(
    (c) => c.criadoEm >= startIso && c.criadoEm <= endIso,
  );
  const orderCountByClient = countConfirmedOrdersByClient(orders);
  const clientIdsWithOrder = new Set(orderCountByClient.keys());
  const novosComPedido = periodClients.filter((c) =>
    clientIdsWithOrder.has(c.id),
  ).length;
  const novosSemPedido = periodClients.length - novosComPedido;
  const taxaConversaoNovos =
    periodClients.length > 0 ? novosComPedido / periodClients.length : 0;
  const nuncaCompraram = clients.filter(
    (c) => !clientIdsWithOrder.has(c.id),
  ).length;
  const recentClients = [...periodClients]
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      nome: c.nome,
      criadoEm: c.criadoEm,
      temPedido: clientIdsWithOrder.has(c.id),
      temCelular: Boolean(c.celular),
      temEmail: Boolean(c.email),
      pedidosCount: orderCountByClient.get(c.id) ?? 0,
    }));

  const usabilityMerged = usabilityMergedEarly;
  const avgSessionMs =
    usabilityMerged.sessions > 0
      ? usabilityMerged.sessionDurationMs / usabilityMerged.sessions
      : 0;

  const topPaths = topEntries(usabilityMerged.byPath, 8).map((e) => ({
    path: e.key,
    count: e.count,
  }));
  const waBySource = topEntries(usabilityMerged.waBySource, 10).map((e) => ({
    source: e.key,
    count: e.count,
  }));
  const waTopProdutos = topEntries(usabilityMerged.waByProdutoId, 8).map(
    (e) => ({
      produtoId: e.key,
      nome: productById.get(e.key)?.nome ?? "Produto removido",
      count: e.count,
    }),
  );

  const confirmedWhatsapp = confirmed.filter((o) => o.canal === "whatsapp")
    .length;
  const funil = buildFunil(
    usabilityMerged.waClicks,
    usabilityMerged.leadsLinked,
    confirmedWhatsapp,
    core.pedidosComCliente,
  );

  const meta = computeMetaProgress(
    siteConfig.metaReceitaMensal ?? null,
    from,
    to,
    core.receita,
  );

  const categoriasAtivas = categories.filter((c) => c.ativo).length;

  return {
    period: { from, to },
    catalogo: {
      produtos: catalogAgg.produtos,
      ativos: catalogAgg.ativos,
      ocultos: catalogAgg.ocultos,
      esgotados: catalogAgg.esgotados,
      categorias: categories.length,
      categoriasAtivas,
      bannersAtivos: banners.length,
      unidadesEstoque: catalogAgg.unidadesEstoque,
      produtosEstoqueZero: catalogAgg.produtosEstoqueZero,
      destaques: catalogAgg.destaques,
      lancamentos: catalogAgg.lancamentos,
      comPromocao: catalogAgg.comPromocao,
      semCapa: catalogAgg.semCapa,
      topProdutos,
    },
    negocio: {
      ...core,
      canalDetalhe: {
        whatsapp: buildCanalDetalhe(periodOrders, "whatsapp"),
        loja_fisica: buildCanalDetalhe(periodOrders, "loja_fisica"),
      },
      funil,
      meta,
      comparacao: {
        anterior: prevBounds,
        receita: comparisonMetric(core.receita, prevCore.receita),
        confirmados: comparisonMetric(core.confirmados, prevCore.confirmados),
        ticketMedio: comparisonMetric(core.ticketMedio, prevCore.ticketMedio),
        taxaCancelamento: comparisonMetric(
          core.taxaCancelamento,
          prevCore.taxaCancelamento,
        ),
      },
    },
    serie: series,
    serieCanal,
    negocioTopProdutos,
    negocioTopCategorias,
    negocioMix: buildMixVariantes(confirmed, 5),
    negocioRecentes: buildNegocioRecentes(periodOrders, clientById, 10),
    negocioPorDiaSemana: buildPorDiaSemana(confirmed),
    negocioPorHora: buildPorHora(confirmed),
    clientes: {
      total: clients.length,
      novos: periodClients.length,
      novosComPedido,
      novosSemPedido,
      taxaConversaoNovos,
      recorrentes: countClientesRecorrentes(confirmed),
      nuncaCompraram,
      contato: buildClientContactMix(clients),
      atribuicao: {
        pedidosComCliente: core.pedidosComCliente,
        pedidosSemCliente: core.pedidosSemCliente,
      },
      serieCadastros: buildCadastrosSeries(from, to, periodClients),
      topPorReceita: buildTopClientesPorReceita(confirmed, clientById, 8),
      recentes: recentClients,
    },
    usabilidade: {
      pageviews: usabilityMerged.pageviews,
      sessions: usabilityMerged.sessions,
      sessionDurationMs: usabilityMerged.sessionDurationMs,
      avgSessionMs,
      waClicks: usabilityMerged.waClicks,
      leadsLinked: usabilityMerged.leadsLinked,
      topPaths,
      waBySource,
      waTopProdutos,
      daily: dailyRows.map((d) => ({
        date: d.date,
        pageviews: d.pageviews,
        sessions: d.sessions,
        waClicks: d.waClicks,
      })),
    },
  };
}

export async function getDashboardStats(from?: string, to?: string) {
  const period = resolvePeriod(from, to);
  return unstable_cache(
    async () => computeDashboardStats(period.from, period.to),
    ["admin-dashboard-stats-v6", period.from, period.to],
    {
      tags: [
        CACHE_TAGS.dashboard,
        CACHE_TAGS.products,
        CACHE_TAGS.banners,
        CACHE_TAGS.orders,
        CACHE_TAGS.categories,
        CACHE_TAGS.clients,
        CACHE_TAGS.analytics,
        CACHE_TAGS.siteConfig,
      ],
      revalidate: DASHBOARD_REVALIDATE,
    },
  )();
}

/** Pedidos no período (para export CSV). */
export async function getDashboardOrdersForExport(from: string, to: string) {
  const bounds = periodBoundsIso(from, to);
  if (!bounds) return [];
  const [orderIndex, clientIndex] = await Promise.all([
    getOrderIndexState(),
    getClientIndexState(),
  ]);
  const orders = orderIndex.entries.map(indexEntryToOrder);
  const clientById = new Map(
    clientIndex.entries.map((c) => [c.id, indexEntryToClient(c)]),
  );
  const periodOrders = filterOrdersInPeriod(
    orders,
    bounds.startIso,
    bounds.endIso,
  );
  return periodOrders.map((o) => ({
    order: o,
    clienteNome: o.clienteId
      ? (clientById.get(o.clienteId)?.nome ?? "")
      : "",
  }));
}
