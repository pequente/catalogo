import styles from "./NegocioPanel.module.css";

export function DeltaBadge({ deltaPct }: { deltaPct: number | null }) {
  if (deltaPct == null) {
    return (
      <span className={`${styles.delta} ${styles.deltaMuted}`}>
        — vs período anterior
      </span>
    );
  }
  const pct = deltaPct * 100;
  const sign = pct > 0 ? "+" : "";
  const cls =
    pct > 0
      ? styles.deltaUp
      : pct < 0
        ? styles.deltaDown
        : styles.deltaMuted;
  return (
    <span className={`${styles.delta} ${cls}`}>
      {sign}
      {pct.toFixed(Math.abs(pct) > 0 && Math.abs(pct) < 10 ? 1 : 0)}% vs período
      anterior
    </span>
  );
}
