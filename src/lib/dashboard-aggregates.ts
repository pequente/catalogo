import {
  addDaysDateOnly,
  eachDateInclusive,
  isoDayInSaoPaulo,
  parseDateOnly,
} from "@/src/lib/analytics-date";
import type { Category } from "@/src/schemas/category";
import type { Client } from "@/src/schemas/client";
import type {
  DashboardCanalDetalhe,
  DashboardComparacaoMetric,
  DashboardSeriePoint,
} from "@/src/schemas/dashboard";
import type { Order, OrderCanal } from "@/src/schemas/order";

/** Lean product fields needed by dashboard aggregations (index-compatible). */
export type DashboardProductRef = {
  id?: string;
  nome: string;
  categoriasIds: string[];
};

const DOW_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export function orderTotal(order: Order): number {
  return order.itens.reduce(
    (sum, item) => sum + item.precoUnitario * item.quantidade,
    0,
  );
}

export function orderUnits(order: Order): number {
  return order.itens.reduce((sum, item) => sum + item.quantidade, 0);
}

export function previousPeriodBounds(from: string, to: string): {
  from: string;
  to: string;
} {
  const days = eachDateInclusive(from, to).length;
  const prevTo = addDaysDateOnly(from, -1);
  const prevFrom = addDaysDateOnly(from, -days);
  return { from: prevFrom, to: prevTo };
}

export function daysInMonthOfDate(dateStr: string): number {
  const dt = parseDateOnly(dateStr);
  if (!dt) return 30;
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth();
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

export function computeMetaProgress(
  metaMensal: number | null | undefined,
  periodFrom: string,
  periodTo: string,
  receitaPeriodo: number,
): {
  mensal: number | null;
  proporcional: number | null;
  receitaPeriodo: number;
  percentualAtingido: number | null;
} {
  const receita = receitaPeriodo;
  if (metaMensal == null || metaMensal <= 0) {
    return {
      mensal: null,
      proporcional: null,
      receitaPeriodo: receita,
      percentualAtingido: null,
    };
  }
  const periodDays = eachDateInclusive(periodFrom, periodTo).length;
  const monthDays = daysInMonthOfDate(periodTo);
  const proporcional = (metaMensal * periodDays) / monthDays;
  const percentualAtingido =
    proporcional > 0 ? receita / proporcional : null;
  return {
    mensal: metaMensal,
    proporcional,
    receitaPeriodo: receita,
    percentualAtingido,
  };
}

export function comparisonMetric(
  valorAtual: number,
  valorAnterior: number,
): DashboardComparacaoMetric {
  const deltaPct =
    valorAnterior === 0 ? null : (valorAtual - valorAnterior) / valorAnterior;
  return { valorAtual, valorAnterior, deltaPct };
}

export function emptyCanalDetalhe(): DashboardCanalDetalhe {
  return {
    pedidos: 0,
    confirmados: 0,
    cancelados: 0,
    receita: 0,
    ticketMedio: 0,
  };
}

export function buildCanalDetalhe(
  periodOrders: Order[],
  canal: OrderCanal,
): DashboardCanalDetalhe {
  const canalOrders = periodOrders.filter((o) => o.canal === canal);
  const confirmed = canalOrders.filter((o) => o.status === "confirmado");
  const cancelled = canalOrders.filter((o) => o.status === "cancelado");
  const receita = confirmed.reduce((sum, o) => sum + orderTotal(o), 0);
  return {
    pedidos: canalOrders.length,
    confirmados: confirmed.length,
    cancelados: cancelled.length,
    receita,
    ticketMedio: confirmed.length ? receita / confirmed.length : 0,
  };
}

export function buildDailySeries(
  from: string,
  to: string,
  confirmed: Order[],
  canal?: OrderCanal,
): DashboardSeriePoint[] {
  const days = eachDateInclusive(from, to);
  const seriesMap = new Map(
    days.map((d) => [d, { date: d, pedidos: 0, receita: 0 }]),
  );
  for (const order of confirmed) {
    if (canal && order.canal !== canal) continue;
    const day = isoDayInSaoPaulo(order.criadoEm);
    const bucket = seriesMap.get(day);
    if (!bucket) continue;
    bucket.pedidos += 1;
    bucket.receita += orderTotal(order);
  }
  return [...seriesMap.values()];
}

export function hourInSaoPaulo(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date(iso));
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  return parseInt(hour, 10) % 24;
}

export function dowFromDateOnly(dateStr: string): number {
  const dt = parseDateOnly(dateStr);
  if (!dt) return 0;
  return new Date(
    Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
  ).getUTCDay();
}

export function buildPorDiaSemana(confirmed: Order[]): Array<{
  dow: number;
  label: string;
  pedidos: number;
  receita: number;
}> {
  const buckets = DOW_LABELS.map((label, dow) => ({
    dow,
    label,
    pedidos: 0,
    receita: 0,
  }));
  for (const order of confirmed) {
    const day = isoDayInSaoPaulo(order.criadoEm);
    const dow = dowFromDateOnly(day);
    const bucket = buckets[dow];
    if (!bucket) continue;
    bucket.pedidos += 1;
    bucket.receita += orderTotal(order);
  }
  return buckets;
}

export function buildPorHora(confirmed: Order[]): Array<{
  hour: number;
  pedidos: number;
}> {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, pedidos: 0 }));
  for (const order of confirmed) {
    const h = hourInSaoPaulo(order.criadoEm);
    const bucket = buckets[h];
    if (bucket) bucket.pedidos += 1;
  }
  return buckets;
}

export function buildTopProdutosByRevenue(
  confirmed: Order[],
  productById: Map<string, DashboardProductRef>,
  limit: number,
): Array<{
  produtoId: string;
  nome: string;
  quantidade: number;
  receita: number;
}> {
  const qty = new Map<string, number>();
  const rev = new Map<string, number>();
  for (const order of confirmed) {
    for (const item of order.itens) {
      qty.set(item.produtoId, (qty.get(item.produtoId) ?? 0) + item.quantidade);
      rev.set(
        item.produtoId,
        (rev.get(item.produtoId) ?? 0) +
          item.precoUnitario * item.quantidade,
      );
    }
  }
  return [...rev.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([produtoId, receita]) => ({
      produtoId,
      nome: productById.get(produtoId)?.nome ?? "Produto removido",
      quantidade: qty.get(produtoId) ?? 0,
      receita,
    }));
}

export function buildTopProdutosByQty(
  confirmed: Order[],
  productById: Map<string, DashboardProductRef>,
  limit: number,
): Array<{
  produtoId: string;
  nome: string;
  quantidade: number;
  receita: number;
}> {
  const productQty = new Map<string, number>();
  const productRev = new Map<string, number>();
  for (const order of confirmed) {
    for (const item of order.itens) {
      productQty.set(
        item.produtoId,
        (productQty.get(item.produtoId) ?? 0) + item.quantidade,
      );
      productRev.set(
        item.produtoId,
        (productRev.get(item.produtoId) ?? 0) +
          item.precoUnitario * item.quantidade,
      );
    }
  }
  return [...productQty.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([produtoId, quantidade]) => ({
      produtoId,
      nome: productById.get(produtoId)?.nome ?? "Produto removido",
      quantidade,
      receita: productRev.get(produtoId) ?? 0,
    }));
}

export function buildTopCategorias(
  confirmed: Order[],
  productById: Map<string, DashboardProductRef>,
  categoryById: Map<string, Category>,
  limit: number,
): Array<{
  categoriaId: string;
  nome: string;
  quantidade: number;
  receita: number;
}> {
  const qty = new Map<string, number>();
  const rev = new Map<string, number>();
  for (const order of confirmed) {
    for (const item of order.itens) {
      const product = productById.get(item.produtoId);
      if (!product) continue;
      const lineRev = item.precoUnitario * item.quantidade;
      for (const catId of product.categoriasIds) {
        qty.set(catId, (qty.get(catId) ?? 0) + item.quantidade);
        rev.set(catId, (rev.get(catId) ?? 0) + lineRev);
      }
    }
  }
  return [...rev.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))
    .slice(0, limit)
    .map(([categoriaId, receita]) => ({
      categoriaId,
      nome: categoryById.get(categoriaId)?.nome ?? "Categoria removida",
      quantidade: qty.get(categoriaId) ?? 0,
      receita,
    }));
}

export function buildMixVariantes(
  confirmed: Order[],
  limit: number,
): {
  tamanhos: Array<{ label: string; quantidade: number }>;
  cores: Array<{ label: string; quantidade: number }>;
} {
  const tamanhos = new Map<string, number>();
  const cores = new Map<string, number>();
  for (const order of confirmed) {
    for (const item of order.itens) {
      bump(tamanhos, item.tamanho, item.quantidade);
      bump(cores, item.cor, item.quantidade);
    }
  }
  return {
    tamanhos: topMapEntries(tamanhos, limit),
    cores: topMapEntries(cores, limit),
  };
}

function bump(map: Map<string, number>, key: string, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function topMapEntries(
  map: Map<string, number>,
  limit: number,
): Array<{ label: string; quantidade: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, quantidade]) => ({ label, quantidade }));
}

export function countClientesRecorrentes(confirmed: Order[]): number {
  const counts = new Map<string, number>();
  for (const order of confirmed) {
    if (!order.clienteId) continue;
    counts.set(order.clienteId, (counts.get(order.clienteId) ?? 0) + 1);
  }
  let n = 0;
  for (const c of counts.values()) {
    if (c >= 2) n += 1;
  }
  return n;
}

export function buildNegocioRecentes(
  periodOrders: Order[],
  clientById: Map<string, Client>,
  limit: number,
): Array<{
  id: string;
  criadoEm: string;
  status: Order["status"];
  canal: Order["canal"];
  total: number;
  clienteNome: string | null;
}> {
  return [...periodOrders]
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, limit)
    .map((o) => ({
      id: o.id,
      criadoEm: o.criadoEm,
      status: o.status,
      canal: o.canal,
      total: orderTotal(o),
      clienteNome: o.clienteId
        ? (clientById.get(o.clienteId)?.nome ?? null)
        : null,
    }));
}

export type NegocioCoreMetrics = {
  pedidos: number;
  confirmados: number;
  cancelados: number;
  taxaCancelamento: number;
  receita: number;
  ticketMedio: number;
  canalWhatsapp: number;
  canalLoja: number;
  unidadesVendidas: number;
  pedidosComCliente: number;
  pedidosSemCliente: number;
  clientesRecorrentes: number;
};

export function computeNegocioCore(periodOrders: Order[]): NegocioCoreMetrics {
  const confirmed = periodOrders.filter((o) => o.status === "confirmado");
  const cancelled = periodOrders.filter((o) => o.status === "cancelado");
  const revenue = confirmed.reduce((sum, o) => sum + orderTotal(o), 0);
  const unidadesVendidas = confirmed.reduce((sum, o) => sum + orderUnits(o), 0);
  const pedidosComCliente = periodOrders.filter((o) => o.clienteId).length;
  return {
    pedidos: periodOrders.length,
    confirmados: confirmed.length,
    cancelados: cancelled.length,
    taxaCancelamento:
      periodOrders.length > 0 ? cancelled.length / periodOrders.length : 0,
    receita: revenue,
    ticketMedio: confirmed.length ? revenue / confirmed.length : 0,
    canalWhatsapp: periodOrders.filter((o) => o.canal === "whatsapp").length,
    canalLoja: periodOrders.filter((o) => o.canal === "loja_fisica").length,
    unidadesVendidas,
    pedidosComCliente,
    pedidosSemCliente: periodOrders.length - pedidosComCliente,
    clientesRecorrentes: countClientesRecorrentes(confirmed),
  };
}

export function buildFunil(
  waClicks: number,
  leadsLinked: number,
  confirmedWhatsapp: number,
  pedidosComCliente: number,
): {
  waClicks: number;
  pedidosCanalWhatsapp: number;
  taxaClickParaPedido: number;
  leadsLinked: number;
  pedidosComCliente: number;
  taxaLeadParaPedido: number;
} {
  return {
    waClicks,
    pedidosCanalWhatsapp: confirmedWhatsapp,
    taxaClickParaPedido: waClicks > 0 ? confirmedWhatsapp / waClicks : 0,
    leadsLinked,
    pedidosComCliente,
    taxaLeadParaPedido:
      leadsLinked > 0 ? pedidosComCliente / leadsLinked : 0,
  };
}

export function filterOrdersInPeriod(
  orders: Order[],
  startIso: string,
  endIso: string,
): Order[] {
  return orders.filter((o) => o.criadoEm >= startIso && o.criadoEm <= endIso);
}

export function buildClientContactMix(clients: Client[]): {
  comCelular: number;
  comEmail: number;
  comAmbos: number;
  soCelular: number;
  soEmail: number;
} {
  let comCelular = 0;
  let comEmail = 0;
  let comAmbos = 0;
  let soCelular = 0;
  let soEmail = 0;
  for (const c of clients) {
    const hasCel = Boolean(c.celular);
    const hasEmail = Boolean(c.email);
    if (hasCel) comCelular += 1;
    if (hasEmail) comEmail += 1;
    if (hasCel && hasEmail) {
      comAmbos += 1;
    } else if (hasCel) {
      soCelular += 1;
    } else if (hasEmail) {
      soEmail += 1;
    }
  }
  return { comCelular, comEmail, comAmbos, soCelular, soEmail };
}

export function buildCadastrosSeries(
  from: string,
  to: string,
  periodClients: Client[],
): Array<{ date: string; count: number }> {
  const days = eachDateInclusive(from, to);
  const seriesMap = new Map(days.map((d) => [d, { date: d, count: 0 }]));
  for (const client of periodClients) {
    const day = isoDayInSaoPaulo(client.criadoEm);
    const bucket = seriesMap.get(day);
    if (!bucket) continue;
    bucket.count += 1;
  }
  return [...seriesMap.values()];
}

export function buildTopClientesPorReceita(
  confirmed: Order[],
  clientById: Map<string, Client>,
  limit: number,
): Array<{ id: string; nome: string; pedidos: number; receita: number }> {
  const byClient = new Map<string, { pedidos: number; receita: number }>();
  for (const order of confirmed) {
    if (!order.clienteId) continue;
    const cur = byClient.get(order.clienteId) ?? { pedidos: 0, receita: 0 };
    cur.pedidos += 1;
    cur.receita += orderTotal(order);
    byClient.set(order.clienteId, cur);
  }
  return [...byClient.entries()]
    .map(([id, v]) => ({
      id,
      nome: clientById.get(id)?.nome ?? "Cliente removido",
      pedidos: v.pedidos,
      receita: v.receita,
    }))
    .sort(
      (a, b) =>
        b.receita - a.receita ||
        b.pedidos - a.pedidos ||
        a.nome.localeCompare(b.nome),
    )
    .slice(0, limit);
}

/** Contagem all-time de pedidos confirmados por clienteId. */
export function countConfirmedOrdersByClient(
  orders: Order[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const order of orders) {
    if (!order.clienteId || order.status !== "confirmado") continue;
    counts.set(order.clienteId, (counts.get(order.clienteId) ?? 0) + 1);
  }
  return counts;
}
