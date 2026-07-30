import type { DashboardStats } from "@/src/schemas/dashboard";
import { DashEmpty } from "../DashEmpty";
import { DashSectionCollapsible } from "../DashSectionCollapsible";
import { HourBarList, SimpleBarList } from "../SimpleBarList";
import styles from "../NegocioPanel.module.css";

type Props = {
  stats: DashboardStats;
  sectionIndex: number;
};

export function PadroesTemporaisSection({ stats, sectionIndex }: Props) {
  const hasSales = stats.negocio.confirmados > 0;

  return (
    <DashSectionCollapsible
      sectionIndex={sectionIndex}
      title="Padrões temporais"
    >
      <div className={styles.chartGrid}>
        <div className={styles.panel}>
          <h4 className={styles.panelTitle}>Por dia da semana</h4>
          {hasSales ? (
            <SimpleBarList
              items={stats.negocioPorDiaSemana.map((d) => ({
                label: d.label,
                value: d.pedidos,
              }))}
              valueLabel="ped."
              ariaLabel="Pedidos por dia da semana"
            />
          ) : (
            <DashEmpty title="Sem dados" />
          )}
        </div>
        <div className={styles.panel}>
          <h4 className={styles.panelTitle}>Por hora do dia</h4>
          {hasSales ? (
            <HourBarList
              items={stats.negocioPorHora}
              ariaLabel="Pedidos por hora"
            />
          ) : (
            <DashEmpty title="Sem dados" />
          )}
        </div>
      </div>
    </DashSectionCollapsible>
  );
}
