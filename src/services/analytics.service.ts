import "server-only";
import { listJsonDir, readJson, writeJson } from "@/src/lib/data";
import { eachDateInclusive } from "@/src/lib/analytics-date";
import {
  dailyAnalyticsSchema,
  type AnalyticsBatch,
  type DailyAnalytics,
} from "@/src/schemas/analytics";

const DIR = "analytics/daily";
const MAX_SEEN = 5000;

function pathFor(date: string) {
  return `${DIR}/${date}.json`;
}

export function emptyDaily(date: string): DailyAnalytics {
  return {
    date,
    pageviews: 0,
    byPath: {},
    sessions: 0,
    sessionDurationMs: 0,
    waClicks: 0,
    waBySource: {},
    waByProdutoId: {},
    leadsLinked: 0,
    seenSessionIds: [],
    linkedSessionIds: [],
  };
}

function bump(map: Record<string, number>, key: string, by = 1) {
  map[key] = (map[key] ?? 0) + by;
}

function normalizePath(path: string): string {
  try {
    const url = path.startsWith("http")
      ? new URL(path)
      : new URL(path, "https://example.local");
    let p = url.pathname || "/";
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
    return p.slice(0, 200) || "/";
  } catch {
    return "/";
  }
}

function trackSession(daily: DailyAnalytics, sessionId: string) {
  if (daily.seenSessionIds.includes(sessionId)) return;
  daily.sessions += 1;
  if (daily.seenSessionIds.length < MAX_SEEN) {
    daily.seenSessionIds.push(sessionId);
  }
}

function applyBatch(daily: DailyAnalytics, batch: AnalyticsBatch): void {
  trackSession(daily, batch.sessionId);

  for (const event of batch.events) {
    switch (event.type) {
      case "pageview": {
        daily.pageviews += 1;
        bump(daily.byPath, normalizePath(event.path));
        break;
      }
      case "heartbeat": {
        daily.sessionDurationMs += event.durationMs;
        break;
      }
      case "wa_click": {
        daily.waClicks += 1;
        bump(daily.waBySource, event.source);
        if (event.produtoId) bump(daily.waByProdutoId, event.produtoId);
        break;
      }
      case "client_link": {
        if (daily.linkedSessionIds.includes(batch.sessionId)) break;
        daily.leadsLinked += 1;
        if (daily.linkedSessionIds.length < MAX_SEEN) {
          daily.linkedSessionIds.push(batch.sessionId);
        }
        break;
      }
      default:
        break;
    }
  }
}

export async function getDailyAnalytics(
  date: string,
): Promise<DailyAnalytics | null> {
  const raw = await readJson<unknown>(pathFor(date));
  if (!raw) return null;
  const parsed = dailyAnalyticsSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(`[analytics] invalid ${date}`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function ingestAnalyticsBatch(
  batch: AnalyticsBatch,
  date: string,
): Promise<DailyAnalytics> {
  const existing = (await getDailyAnalytics(date)) ?? emptyDaily(date);
  const next: DailyAnalytics = {
    ...existing,
    byPath: { ...existing.byPath },
    waBySource: { ...existing.waBySource },
    waByProdutoId: { ...existing.waByProdutoId },
    seenSessionIds: [...existing.seenSessionIds],
    linkedSessionIds: [...existing.linkedSessionIds],
  };
  applyBatch(next, batch);
  dailyAnalyticsSchema.parse(next);
  await writeJson(pathFor(date), next, {
    message: `chore(data): analytics ${date}`,
  });
  return next;
}

export type DailyAnalyticsPublic = Omit<
  DailyAnalytics,
  "seenSessionIds" | "linkedSessionIds"
>;

export function toPublicDaily(d: DailyAnalytics): DailyAnalyticsPublic {
  const { seenSessionIds, linkedSessionIds, ...rest } = d;
  void seenSessionIds;
  void linkedSessionIds;
  return rest;
}

export async function getDailyRange(
  from: string,
  to: string,
): Promise<DailyAnalyticsPublic[]> {
  const dates = eachDateInclusive(from, to);
  const rows = await Promise.all(
    dates.map(async (date) => {
      const row = await getDailyAnalytics(date);
      return row ? toPublicDaily(row) : toPublicDaily(emptyDaily(date));
    }),
  );
  return rows;
}

export async function listAnalyticsDates(): Promise<string[]> {
  const files = await listJsonDir(DIR);
  return files
    .map((f) => f.replace(/\.json$/, ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
}

export function mergeDailyPublic(
  rows: DailyAnalyticsPublic[],
): DailyAnalyticsPublic {
  const out: DailyAnalyticsPublic = {
    date: rows.length === 1 ? (rows[0]?.date ?? "") : `${rows[0]?.date ?? ""}…`,
    pageviews: 0,
    byPath: {},
    sessions: 0,
    sessionDurationMs: 0,
    waClicks: 0,
    waBySource: {},
    waByProdutoId: {},
    leadsLinked: 0,
  };

  for (const row of rows) {
    out.pageviews += row.pageviews;
    out.sessions += row.sessions;
    out.sessionDurationMs += row.sessionDurationMs;
    out.waClicks += row.waClicks;
    out.leadsLinked += row.leadsLinked;
    for (const [k, v] of Object.entries(row.byPath)) bump(out.byPath, k, v);
    for (const [k, v] of Object.entries(row.waBySource))
      bump(out.waBySource, k, v);
    for (const [k, v] of Object.entries(row.waByProdutoId))
      bump(out.waByProdutoId, k, v);
  }
  return out;
}
