import { formatBrl } from "@/src/lib/front/format";
import type { DashboardCanalDetalhe } from "@/src/schemas/dashboard";
import styles from "./NegocioPanel.module.css";
import { DashIcon, dashIcons } from "./icons";

const LABELS = {
  whatsapp: "WhatsApp",
  loja_fisica: "Loja física",
} as const;

type CanalId = keyof typeof LABELS;

export function CanalCard({
  canal,
  detalhe,
}: {
  canal: CanalId;
  detalhe: DashboardCanalDetalhe;
}) {
  const isWa = canal === "whatsapp";
  return (
    <article
      className={`${styles.canal} ${isWa ? styles.canalWhatsapp : styles.canalLoja}`}
    >
      <div className={styles.canalHead}>
        <DashIcon
          icon={isWa ? dashIcons.whatsapp : dashIcons.loja}
          className={isWa ? styles.canalIconWa : styles.canalIconLoja}
        />
        <h4 className={styles.canalTitle}>{LABELS[canal]}</h4>
      </div>
      <dl className={styles.canalDl}>
        <div>
          <dt>Pedidos</dt>
          <dd>{detalhe.pedidos}</dd>
        </div>
        <div>
          <dt>Confirmados</dt>
          <dd>{detalhe.confirmados}</dd>
        </div>
        <div>
          <dt>Receita</dt>
          <dd>{formatBrl(detalhe.receita)}</dd>
        </div>
        <div>
          <dt>Ticket médio</dt>
          <dd>{formatBrl(detalhe.ticketMedio)}</dd>
        </div>
      </dl>
    </article>
  );
}
