import type { DashboardStats } from "@/src/schemas/dashboard";
import { CanalCard } from "./CanalCard";
import { DashSectionCollapsible } from "./DashSectionCollapsible";
import { EvolucaoDiariaSection } from "./sections/EvolucaoDiariaSection";
import { FunilSection } from "./sections/FunilSection";
import { PadroesTemporaisSection } from "./sections/PadroesTemporaisSection";
import { PedidosRecentesSection } from "./sections/PedidosRecentesSection";
import { dashIcons } from "./icons";
import { KpiCard } from "./KpiCard";
import styles from "./NegocioPanel.module.css";

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

type Props = {
  stats: DashboardStats;
};

export function VendasPanel({ stats }: Props) {
  const { negocio } = stats;
  const cmp = negocio.comparacao;

  return (
    <div
      className={`dashboard-section dashboard-section--vendas ${styles.root}`}
    >
      <DashSectionCollapsible
        sectionIndex={0}
        title="Números do período"
        description="Complemento aos indicadores do Resumo."
      >
        <div className={styles.compactGrid}>
          <KpiCard
            icon={dashIcons.pedidos}
            label="Total de pedidos"
            value={negocio.pedidos}
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
          <KpiCard
            variant="caution"
            icon={dashIcons.cancelados}
            label="Taxa de cancelamento"
            value={formatPct(negocio.taxaCancelamento)}
            deltaPct={cmp.taxaCancelamento.deltaPct}
          />
        </div>
      </DashSectionCollapsible>

      <DashSectionCollapsible
        sectionIndex={1}
        title="Canais de venda"
      >
        <div className={styles.canalGrid}>
          <CanalCard canal="whatsapp" detalhe={negocio.canalDetalhe.whatsapp} />
          <CanalCard
            canal="loja_fisica"
            detalhe={negocio.canalDetalhe.loja_fisica}
          />
        </div>
      </DashSectionCollapsible>

      <FunilSection stats={stats} sectionIndex={2} />
      <EvolucaoDiariaSection stats={stats} sectionIndex={3} />
      <PadroesTemporaisSection stats={stats} sectionIndex={4} />
      <PedidosRecentesSection stats={stats} sectionIndex={5} />
    </div>
  );
}
