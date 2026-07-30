import Link from "next/link";
import { formatBrl } from "@/src/lib/front/format";
import type {
  DashboardPeriodPreset,
  DashboardStats,
} from "@/src/schemas/dashboard";
import { CanalCard } from "./CanalCard";
import { DashEmpty } from "./DashEmpty";
import { DashSection } from "./DashSection";
import { FunnelStrip } from "./FunnelStrip";
import { KpiCard } from "./KpiCard";
import { MetaProgress } from "./MetaProgress";
import {
  BarChart,
  Sparkline,
  StackedBarChart,
} from "./charts";
import { DashIcon, dashIcons } from "./icons";
import styles from "./NegocioPanel.module.css";
import {
  TemporalOrdersByHour,
  TemporalOrdersList,
} from "./TemporalOrdersList";

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  loja_fisica: "Loja física",
};

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function exportHref(
  preset: DashboardPeriodPreset,
  from: string,
  to: string,
): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    params.set("from", from);
    params.set("to", to);
  }
  return `/api/v1/admin/dashboard/export?${params}`;
}

type Props = {
  stats: DashboardStats;
  preset: DashboardPeriodPreset;
};

export function NegocioPanel({ stats, preset }: Props) {
  const { negocio } = stats;
  const cmp = negocio.comparacao;
  const receitaSpark = stats.serie.map((d) => d.receita);
  const hasSales = negocio.confirmados > 0;

  const exportActions = (
    <>
      <Sparkline
        values={receitaSpark}
        label="Receita no período"
        className={styles.spark}
      />
      <a
        className={`btn btn-ghost btn-sm ${styles.exportBtn}`}
        href={exportHref(preset, stats.period.from, stats.period.to)}
        download
      >
        <DashIcon icon={dashIcons.export} />
        Exportar CSV
      </a>
    </>
  );

  return (
    <div
      className={`dashboard-section dashboard-section--negocio ${styles.root}`}
    >
      <DashSection
        title="Desempenho no período"
        description="Indicadores principais e comparação com o intervalo anterior de mesma duração."
        actions={exportActions}
      >
        <MetaProgress {...negocio.meta} />
        <div className={styles.heroBand}>
          <KpiCard
            variant="hero"
            icon={dashIcons.receita}
            label="Receita"
            value={formatBrl(negocio.receita)}
            deltaPct={cmp.receita.deltaPct}
            href="/admin/pedidos"
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.pedidos}
            label="Pedidos confirmados"
            value={negocio.confirmados}
            deltaPct={cmp.confirmados.deltaPct}
            href="/admin/pedidos"
          />
          <KpiCard
            variant="hero"
            icon={dashIcons.ticket}
            label="Ticket médio"
            value={formatBrl(negocio.ticketMedio)}
            deltaPct={cmp.ticketMedio.deltaPct}
            href="/admin/pedidos"
          />
        </div>
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.pedidos}
            label="Total de pedidos"
            value={negocio.pedidos}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.cancelados}
            label="Cancelados"
            value={negocio.cancelados}
          />
          <KpiCard
            variant="caution"
            icon={dashIcons.cancelados}
            label="Taxa de cancelamento"
            value={formatPct(negocio.taxaCancelamento)}
            deltaPct={cmp.taxaCancelamento.deltaPct}
          />
          <KpiCard
            icon={dashIcons.unidades}
            label="Unidades vendidas"
            value={negocio.unidadesVendidas}
          />
          <KpiCard
            icon={dashIcons.clientes}
            label="Pedidos com cliente"
            value={negocio.pedidosComCliente}
          />
          <KpiCard
            icon={dashIcons.clientes}
            label="Clientes recorrentes"
            value={negocio.clientesRecorrentes}
          />
        </div>
      </DashSection>

      <DashSection title="Canais de venda">
        <div className={styles.canalGrid}>
          <CanalCard canal="whatsapp" detalhe={negocio.canalDetalhe.whatsapp} />
          <CanalCard canal="loja_fisica" detalhe={negocio.canalDetalhe.loja_fisica} />
        </div>
      </DashSection>

      <DashSection
        title="Funil no período"
        description="Não indicam atribuição exata entre cliques e pedidos."
      >
        <FunnelStrip funil={negocio.funil} />
      </DashSection>

      <DashSection title="Evolução diária">
        <div className={styles.chartGrid}>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Pedidos por dia (por canal)</h4>
            {hasSales ? (
              <StackedBarChart
                whatsapp={stats.serieCanal.whatsapp}
                loja={stats.serieCanal.loja_fisica}
                label="Pedidos por dia por canal"
              />
            ) : (
              <DashEmpty
                title="Sem pedidos confirmados"
                text="Ajuste o período ou registre vendas em Pedidos."
              />
            )}
          </div>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Receita por dia</h4>
            {hasSales ? (
              <BarChart
                data={stats.serie}
                valueKey="receita"
                label="Receita por dia"
              />
            ) : (
              <DashEmpty title="Sem receita no período" />
            )}
          </div>
        </div>
      </DashSection>

      <DashSection
        title="Quando os pedidos acontecem"
        description="Pedidos confirmados no período, agrupados por dia da semana e hora do relógio."
      >
        <div className={styles.chartGrid}>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Pedidos por dia da semana</h4>
            {hasSales ? (
              <TemporalOrdersList
                items={stats.negocioPorDiaSemana.map((d) => ({
                  label: d.label,
                  value: d.pedidos,
                }))}
                ariaLabel="Pedidos confirmados por dia da semana"
                variant="weekday"
              />
            ) : (
              <DashEmpty
                title="Sem pedidos no período"
                text="Confirme pedidos para ver a distribuição por dia da semana."
              />
            )}
          </div>
          <div className={styles.panel}>
            <h4 className={styles.panelTitle}>Pedidos por hora do dia</h4>
            {hasSales ? (
              <TemporalOrdersByHour
                items={stats.negocioPorHora}
                ariaLabel="Pedidos confirmados por hora do dia"
              />
            ) : (
              <DashEmpty
                title="Sem pedidos no período"
                text="Confirme pedidos para ver a distribuição por hora."
              />
            )}
          </div>
        </div>
      </DashSection>

      <DashSection title="Produtos e categorias">
        <div className={styles.chartGrid}>
          <div className={`${styles.panel} ${styles.panelTable}`}>
            <h4 className={styles.panelTitle}>Top produtos (receita)</h4>
            {stats.negocioTopProdutos.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.negocioTopProdutos.map((p) => (
                    <tr key={p.produtoId}>
                      <td className={styles.tablePrimaryCell} title={p.nome}>
                        {p.nome}
                      </td>
                      <td>{p.quantidade}</td>
                      <td>{formatBrl(p.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DashEmpty title="Sem vendas no período" />
            )}
          </div>
          <div className={`${styles.panel} ${styles.panelTable}`}>
            <h4 className={styles.panelTitle}>Top categorias</h4>
            {stats.negocioTopCategorias.length ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Qtd.</th>
                    <th>Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.negocioTopCategorias.map((c) => (
                    <tr key={c.categoriaId}>
                      <td className={styles.tablePrimaryCell} title={c.nome}>
                        {c.nome}
                      </td>
                      <td>{c.quantidade}</td>
                      <td>{formatBrl(c.receita)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <DashEmpty title="Sem vendas no período" />
            )}
          </div>
        </div>
      </DashSection>

      <DashSection title="Pedidos e mix">
        <div className={`${styles.panel} ${styles.panelTable}`}>
          <h4 className={styles.panelTitle}>Pedidos recentes no período</h4>
          {stats.negocioRecentes.length ? (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Canal</th>
                  <th>Cliente</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.negocioRecentes.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <Link
                        className={styles.tableLink}
                        href={`/admin/pedidos/${o.id}`}
                      >
                        {formatDateTime(o.criadoEm)}
                      </Link>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusPill} ${o.status === "confirmado"
                          ? styles.statusOk
                          : styles.statusBad
                          }`}
                      >
                        {o.status === "confirmado" ? "Confirmado" : "Cancelado"}
                      </span>
                    </td>
                    <td>{CANAL_LABEL[o.canal] ?? o.canal}</td>
                    <td className={styles.tablePrimaryCell} title={o.clienteNome ?? undefined}>
                      {o.clienteNome ?? "—"}
                    </td>
                    <td>{formatBrl(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <DashEmpty
              title="Nenhum pedido no período"
              text="Os pedidos do intervalo selecionado aparecem aqui."
            />
          )}
        </div>

        {(stats.negocioMix.tamanhos.length > 0 ||
          stats.negocioMix.cores.length > 0) && (
            <div className={styles.chartGrid}>
              <div className={`${styles.panel} ${styles.panelTable}`}>
                <h4 className={styles.panelTitle}>Tamanhos mais vendidos</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tamanho</th>
                      <th>Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.negocioMix.tamanhos.map((t) => (
                      <tr key={t.label}>
                        <td className={styles.tablePrimaryCell} title={t.label}>
                          {t.label}
                        </td>
                        <td>{t.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className={`${styles.panel} ${styles.panelTable}`}>
                <h4 className={styles.panelTitle}>Cores mais vendidas</h4>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Cor</th>
                      <th>Qtd.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.negocioMix.cores.map((c) => (
                      <tr key={c.label}>
                        <td className={styles.tablePrimaryCell} title={c.label}>
                          {c.label}
                        </td>
                        <td>{c.quantidade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
      </DashSection>
    </div>
  );
}
