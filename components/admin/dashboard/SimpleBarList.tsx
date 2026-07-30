type Item = { label: string; value: number };

export function SimpleBarList({
  items,
  valueLabel,
  ariaLabel,
}: {
  items: Item[];
  valueLabel: string;
  ariaLabel: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="dash-hbar-list" aria-label={ariaLabel}>
      {items.map((item) => {
        const w = Math.max(2, Math.round((item.value / max) * 100));
        return (
          <li key={item.label} className="dash-hbar-list__row">
            <span className="dash-hbar-list__label admin-clamp-2" title={item.label}>
              {item.label}
            </span>
            <div className="dash-hbar-list__track">
              <div className="dash-hbar-list__fill" style={{ width: `${w}%` }} />
            </div>
            <span className="dash-hbar-list__value">
              {item.value} {valueLabel}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function HourBarList({
  items,
  ariaLabel,
}: {
  items: Array<{ hour: number; pedidos: number }>;
  ariaLabel: string;
}) {
  const labeled = items.map((i) => ({
    label: `${String(i.hour).padStart(2, "0")}h`,
    value: i.pedidos,
  }));
  return (
    <SimpleBarList
      items={labeled}
      valueLabel="pedidos"
      ariaLabel={ariaLabel}
    />
  );
}
