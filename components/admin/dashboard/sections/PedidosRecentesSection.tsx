import Link from "next/link";
import { formatBrl } from "@/src/lib/front/format";
import type { DashboardStats } from "@/src/schemas/dashboard";
import { DashEmpty } from "../DashEmpty";
import { DashSectionCollapsible } from "../DashSectionCollapsible";
import styles from "../NegocioPanel.module.css";

const CANAL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  loja_fisica: "Loja física",
};

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

type Props = {
  stats: DashboardStats;
  sectionIndex: number;
};

export function PedidosRecentesSection({ stats, sectionIndex }: Props) {
  return (
    <DashSectionCollapsible
      sectionIndex={sectionIndex}
      title="Pedidos recentes no período"
    >
      <div className={`${styles.panel} ${styles.panelTable}`}>
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
                  <td>{o.clienteNome ?? "—"}</td>
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
    </DashSectionCollapsible>
  );
}
