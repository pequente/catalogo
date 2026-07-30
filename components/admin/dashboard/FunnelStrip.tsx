import type { LucideIcon } from "lucide-react";
import styles from "./NegocioPanel.module.css";
import { DashIcon, dashIcons } from "./icons";

type Funil = {
  waClicks: number;
  pedidosCanalWhatsapp: number;
  taxaClickParaPedido: number;
  leadsLinked: number;
  pedidosComCliente: number;
  taxaLeadParaPedido: number;
};

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.01 ? 1 : 0)}%`;
}

function FunnelStep({
  icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className={styles.funnelStep}>
      <div className={styles.funnelStepHead}>
        <DashIcon icon={icon} />
      </div>
      <div className={styles.funnelStepLabel}>{label}</div>
      <div className={styles.funnelStepValue}>{value}</div>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className={styles.funnelDivider} aria-hidden>
      <DashIcon icon={dashIcons.chevron} />
    </div>
  );
}

export function FunnelStrip({ funil }: { funil: Funil }) {
  return (
    <div className={styles.funnelPanel}>
      <div className={styles.funnelStrip}>
        <FunnelStep
          icon={dashIcons.whatsapp}
          label="Cliques no WhatsApp"
          value={funil.waClicks}
        />
        <FunnelArrow />
        <FunnelStep
          icon={dashIcons.pedidos}
          label="Pedidos confirmados (WhatsApp)"
          value={funil.pedidosCanalWhatsapp}
        />
        <FunnelArrow />
        <FunnelStep
          icon={dashIcons.ticket}
          label="Taxa: clique → pedido (WhatsApp)"
          value={formatPct(funil.taxaClickParaPedido)}
        />
        <FunnelArrow />
        <FunnelStep
          icon={dashIcons.clientes}
          label="Contatos vinculados"
          value={funil.leadsLinked}
        />
        <FunnelArrow />
        <FunnelStep
          icon={dashIcons.pedidos}
          label="Pedidos com cliente"
          value={funil.pedidosComCliente}
        />
        <FunnelArrow />
        <FunnelStep
          icon={dashIcons.ticket}
          label="Taxa: contato → pedido com cliente"
          value={formatPct(funil.taxaLeadParaPedido)}
        />
      </div>
    </div>
  );
}
