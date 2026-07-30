const TZ = "America/Sao_Paulo";

/** YYYY-MM-DD in America/Sao_Paulo. */
export function dateInSaoPaulo(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Inclusive list of YYYY-MM-DD between from and to (calendar dates). */
export function eachDateInclusive(from: string, to: string): string[] {
  const out: string[] = [];
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end || start > end) return out;
  const cur = new Date(start);
  while (cur <= end) {
    out.push(formatDateOnly(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null;
  }
  return dt;
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysDateOnly(dateStr: string, days: number): string {
  const dt = parseDateOnly(dateStr);
  if (!dt) return dateStr;
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateOnly(dt);
}

export function startOfMonthDateOnly(dateStr: string): string {
  const dt = parseDateOnly(dateStr);
  if (!dt) return dateStr;
  return formatDateOnly(new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), 1)));
}

/** Instant range covering Sao Paulo calendar days [from, to] inclusive. */
export function periodBoundsIso(from: string, to: string): {
  startIso: string;
  endIso: string;
} | null {
  const start = parseDateOnly(from);
  const end = parseDateOnly(to);
  if (!start || !end || start > end) return null;

  // Midnight Sao Paulo ≈ UTC-3 (ignore rare DST; Brazil has no DST since 2019)
  const startIso = new Date(
    Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
      3,
      0,
      0,
      0,
    ),
  ).toISOString();
  const endExclusive = new Date(
    Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate() + 1,
      3,
      0,
      0,
      0,
    ),
  );
  const endIso = new Date(endExclusive.getTime() - 1).toISOString();
  return { startIso, endIso };
}

export function isoDayInSaoPaulo(iso: string): string {
  return dateInSaoPaulo(new Date(iso));
}
