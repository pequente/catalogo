import { formatBrl } from "@/src/lib/front/format";
import type {
  DashboardPeriodPreset,
  DashboardStats,
} from "@/src/schemas/dashboard";
import { DashSectionCollapsible } from "./DashSectionCollapsible";
import { DashTabJumpButton } from "./DashTabJumpButton";
import { dashboardExportHref } from "./dashboardExport";
import type { DashboardTabId } from "./dashboardTabs";
import { DashIcon, dashIcons } from "./icons";
import { KpiCard } from "./KpiCard";
import { MetaProgress } from "./MetaProgress";
import { Sparkline } from "./charts";
import styles from "./NegocioPanel.module.css";

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

type Props = {
  stats: DashboardStats;
  preset: DashboardPeriodPreset;
  onNavigateTab: (tab: DashboardTabId) => void;
};

export function ResumoPanel({ stats, preset, onNavigateTab }: Props) {
  const { negocio } = stats;
  const cmp = negocio.comparacao;
  const receitaSpark = stats.serie.map((d) => d.receita);

  const exportActions = (
    <>
      <Sparkline
        values={receitaSpark}
        label="Receita no período"
        className={styles.spark}
      />
      <a
        className={`btn btn-ghost btn-sm ${styles.exportBtn}`}
        href={dashboardExportHref(preset, stats.period.from, stats.period.to)}
        download
      >
        <DashIcon icon={dashIcons.export} />
        Exportar CSV
      </a>
    </>
  );

  return (
    <div
      className={`dashboard-section dashboard-section--resumo ${styles.root}`}
    >
      <DashSectionCollapsible
        sectionIndex={0}
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
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={1}
        collapseOnMobile
        title="Mais indicadores"
        description="Cancelamentos e volume vendido no mesmo período."
      >
        <div className={styles.compactGrid}>
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
        </div>
      </DashSectionCollapsible>

      <div className={styles.panel}>
        <h4 className={styles.panelTitle}>Ver mais detalhes</h4>
        <p className={styles.sectionDesc}>
          Gráficos, canais e listas completas estão nas outras abas.
        </p>
        <div className={styles.sectionActions}>
          <DashTabJumpButton tab="vendas" onNavigateTab={onNavigateTab}>
            Vendas e pedidos
          </DashTabJumpButton>
          <DashTabJumpButton tab="produtos" onNavigateTab={onNavigateTab}>
            Produtos mais vendidos
          </DashTabJumpButton>
          <DashTabJumpButton tab="site" onNavigateTab={onNavigateTab}>
            Site e WhatsApp
          </DashTabJumpButton>
        </div>
      </div>
    </div>
  );
}
