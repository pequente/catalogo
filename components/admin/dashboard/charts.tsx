import { formatBrl } from "@/src/lib/front/format";
import type { DashboardSeriePoint } from "@/src/schemas/dashboard";

export function formatShortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

export function BarChart({
  data,
  valueKey,
  label,
}: {
  data: DashboardSeriePoint[];
  valueKey: "pedidos" | "receita";
  label: string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  return (
    <div className="dash-chart" aria-label={label}>
      <div className="dash-chart__bars">
        {data.map((d) => {
          const value = d[valueKey];
          const h = Math.max(2, Math.round((value / max) * 100));
          return (
            <div
              key={d.date}
              className="dash-chart__col"
              title={`${formatShortDate(d.date)}: ${valueKey === "receita" ? formatBrl(value) : value}`}
            >
              <div className="dash-chart__bar" style={{ height: `${h}%` }} />
              <span className="dash-chart__label">{formatShortDate(d.date)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StackedBarChart({
  whatsapp,
  loja,
  label,
}: {
  whatsapp: DashboardSeriePoint[];
  loja: DashboardSeriePoint[];
  label: string;
}) {
  const byDate = new Map<string, { wa: number; loja: number }>();
  for (const p of whatsapp) {
    byDate.set(p.date, { wa: p.pedidos, loja: 0 });
  }
  for (const p of loja) {
    const cur = byDate.get(p.date) ?? { wa: 0, loja: 0 };
    cur.loja = p.pedidos;
    byDate.set(p.date, cur);
  }
  const rows = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v, total: v.wa + v.loja }));
  const max = Math.max(...rows.map((r) => r.total), 1);

  return (
    <div className="dash-chart dash-chart--stacked" aria-label={label}>
      <div className="dash-chart__bars">
        {rows.map((r) => {
          const totalH = Math.max(2, Math.round((r.total / max) * 100));
          const waShare = r.total > 0 ? r.wa / r.total : 0;
          const waH = Math.round(totalH * waShare);
          const lojaH = totalH - waH;
          return (
            <div
              key={r.date}
              className="dash-chart__col"
              title={`${formatShortDate(r.date)}: WhatsApp ${r.wa}, Loja física ${r.loja}`}
            >
              <div className="dash-chart__stack" style={{ height: `${totalH}%` }}>
                {lojaH > 0 ? (
                  <div
                    className="dash-chart__bar dash-chart__bar--loja"
                    style={{ flex: lojaH }}
                  />
                ) : null}
                {waH > 0 ? (
                  <div
                    className="dash-chart__bar dash-chart__bar--wa"
                    style={{ flex: waH }}
                  />
                ) : null}
              </div>
              <span className="dash-chart__label">{formatShortDate(r.date)}</span>
            </div>
          );
        })}
      </div>
      <div className="dash-chart__legend">
        <span>
          <i className="dash-chart__swatch dash-chart__swatch--wa" aria-hidden />
          WhatsApp
        </span>
        <span>
          <i className="dash-chart__swatch dash-chart__swatch--loja" aria-hidden />
          Loja física
        </span>
      </div>
    </div>
  );
}

export function Sparkline({
  values,
  label,
  className,
}: {
  values: number[];
  label: string;
  className?: string;
}) {
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 36;
  const points = values
    .map((v, i) => {
      const x = values.length <= 1 ? 0 : (i / (values.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      className={className ? `dash-spark ${className}` : "dash-spark"}
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      role="img"
      aria-label={label}
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points || "0,18"}
      />
    </svg>
  );
}
