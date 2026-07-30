import type { DashboardStats } from "@/src/schemas/dashboard";
import { BarChart, StackedBarChart } from "../charts";
import { DashEmpty } from "../DashEmpty";
import { DashSectionCollapsible } from "../DashSectionCollapsible";
import styles from "../NegocioPanel.module.css";

type Props = {
  stats: DashboardStats;
  sectionIndex: number;
};

export function EvolucaoDiariaSection({ stats, sectionIndex }: Props) {
  const hasSales = stats.negocio.confirmados > 0;

  return (
    <DashSectionCollapsible
      sectionIndex={sectionIndex}
      title="Evolução diária"
    >
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
    </DashSectionCollapsible>
  );
}
