import styles from "./TemporalOrdersList.module.css";

const fmtInt = new Intl.NumberFormat("pt-BR");

type Item = { label: string; value: number };

type Props = {
  items: Item[];
  ariaLabel: string;
  variant?: "weekday" | "hour";
  showHeader?: boolean;
};

export function TemporalOrdersList({
  items,
  ariaLabel,
  variant = "weekday",
  showHeader = true,
}: Props) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const isHour = variant === "hour";
  const headClass = isHour ? `${styles.head} ${styles.headHour}` : styles.head;
  const rowClass = isHour ? `${styles.row} ${styles.rowHour}` : styles.row;

  return (
    <div>
      {showHeader ? (
        <div className={headClass} aria-hidden>
          <span>{isHour ? "Hora" : "Dia"}</span>
          <span className={styles.headBar}>Volume</span>
          <span>Pedidos</span>
        </div>
      ) : null}
      <ul className={styles.list} aria-label={ariaLabel}>
        {items.map((item) => {
          const w = Math.max(2, Math.round((item.value / max) * 100));
          return (
            <li key={item.label} className={rowClass}>
              <span className={styles.label}>{item.label}</span>
              <div className={styles.track} role="presentation">
                <div className={styles.fill} style={{ width: `${w}%` }} />
              </div>
              <span className={styles.value} title={`${fmtInt.format(item.value)} pedidos`}>
                {fmtInt.format(item.value)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TemporalOrdersByHour({
  items,
  ariaLabel,
}: {
  items: Array<{ hour: number; pedidos: number }>;
  ariaLabel: string;
}) {
  const mapped = items.map((i) => ({
    label: `${String(i.hour).padStart(2, "0")}h`,
    value: i.pedidos,
  }));
  return (
    <TemporalOrdersList
      items={mapped}
      ariaLabel={ariaLabel}
      variant="hour"
    />
  );
}
