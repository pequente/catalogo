import Link from "next/link";
import { formatBrl } from "@/src/lib/front/format";
import styles from "./NegocioPanel.module.css";
import { DashIcon, dashIcons } from "./icons";

type Props = {
  mensal: number | null;
  proporcional: number | null;
  receitaPeriodo: number;
  percentualAtingido: number | null;
};

export function MetaProgress({
  mensal,
  proporcional,
  receitaPeriodo,
  percentualAtingido,
}: Props) {
  if (mensal == null || proporcional == null || percentualAtingido == null) {
    return (
      <div className={styles.meta}>
        <DashIcon icon={dashIcons.meta} className={styles.metaIcon} />
        <div className={styles.metaBody}>
          <p className={styles.metaEmptyText}>
            Nenhuma meta mensal definida.{" "}
            <Link href="/admin/personalizacao?tab=geral">Definir meta</Link>
          </p>
        </div>
      </div>
    );
  }
  const pct = Math.min(percentualAtingido * 100, 100);
  const over = percentualAtingido > 1;
  return (
    <div className={`${styles.meta} ${styles.metaActive}`}>
      <DashIcon icon={dashIcons.meta} className={styles.metaIcon} />
      <div className={styles.metaBody}>
        <div className={styles.metaHead}>
          <span className={styles.metaTitle}>
            Meta de receita (proporcional ao período)
          </span>
          <Link className={styles.metaLink} href="/admin/personalizacao?tab=geral">
            Ajustar meta
          </Link>
        </div>
        <div
          className={styles.metaBar}
          role="progressbar"
          aria-valuenow={Math.round(percentualAtingido * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`${styles.metaFill}${over ? ` ${styles.metaFillOver}` : ""}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={styles.metaDetail}>
          <strong>{formatBrl(receitaPeriodo)}</strong> de {formatBrl(proporcional)}{" "}
          ({(percentualAtingido * 100).toFixed(0)}%) · meta mensal{" "}
          {formatBrl(mensal)}
        </p>
      </div>
    </div>
  );
}
