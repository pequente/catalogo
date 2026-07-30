import { digitsOnly } from "@/src/lib/wa";
import type { Client } from "@/src/schemas/client";
import { PAGINATION } from "@/src/lib/pagination";

export type ClientPeriodPreset =
  | "all"
  | "today"
  | "7d"
  | "30d"
  | "custom";

export type ClientContactFilter = "all" | "whatsapp" | "email";

export type ClientOrderFilter = "all" | "with_order" | "without_order";

export type ClientSort = "created" | "updated" | "name";

export const CLIENT_SORT_OPTIONS: ReadonlyArray<{
  value: ClientSort;
  label: string;
}> = [
  { value: "created", label: "Cadastro (recentes)" },
  { value: "updated", label: "Última atualização" },
  { value: "name", label: "Nome (A–Z)" },
];

export type ClientListFilters = {
  query: string;
  periodPreset: ClientPeriodPreset;
  customFrom: string;
  customTo: string;
  contactFilter: ClientContactFilter;
  orderFilter: ClientOrderFilter;
  sort: ClientSort;
};

export const DEFAULT_CLIENT_LIST_FILTERS: ClientListFilters = {
  query: "",
  periodPreset: "all",
  customFrom: "",
  customTo: "",
  contactFilter: "all",
  orderFilter: "all",
  sort: "created",
};

export function foldForSearch(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function matchesClientQuery(c: Client, raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const qFold = foldForSearch(trimmed);
  const qDigits = digitsOnly(trimmed);
  if (foldForSearch(c.nome).includes(qFold)) return true;
  if (c.email && foldForSearch(c.email).includes(qFold)) return true;
  if (qDigits && c.celular?.includes(qDigits)) return true;
  return false;
}

export function clientHasConfirmedOrder(
  clientId: string,
  orderClientIds: Set<string>,
): boolean {
  return orderClientIds.has(clientId);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfLocalDay(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function parseLocalDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return date;
}

export type PeriodBounds = { startIso: string; endIso: string } | null;

export function resolvePeriodBounds(
  preset: ClientPeriodPreset,
  customFrom?: string,
  customTo?: string,
  now: Date = new Date(),
): PeriodBounds {
  if (preset === "all") return null;

  if (preset === "today") {
    return {
      startIso: startOfLocalDay(now).toISOString(),
      endIso: endOfLocalDay(now).toISOString(),
    };
  }

  if (preset === "7d" || preset === "30d") {
    const days = preset === "7d" ? 7 : 30;
    const end = endOfLocalDay(now);
    const start = startOfLocalDay(now);
    start.setDate(start.getDate() - (days - 1));
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  if (preset === "custom") {
    const from = customFrom?.trim() ? parseLocalDateInput(customFrom) : null;
    const to = customTo?.trim() ? parseLocalDateInput(customTo) : null;
    if (!from && !to) return null;
    const start = from ? startOfLocalDay(from) : startOfLocalDay(new Date(0));
    const end = to ? endOfLocalDay(to) : endOfLocalDay(now);
    if (start.getTime() > end.getTime()) {
      return { startIso: end.toISOString(), endIso: start.toISOString() };
    }
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  }

  return null;
}

function inPeriod(iso: string, startIso: string, endIso: string): boolean {
  const t = new Date(iso).getTime();
  return t >= new Date(startIso).getTime() && t <= new Date(endIso).getTime();
}

export function clientListFiltersActive(filters: ClientListFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.periodPreset !== "all" ||
    filters.contactFilter !== "all" ||
    filters.orderFilter !== "all" ||
    filters.sort !== "created"
  );
}

/** Parse list filters from Next.js searchParams (server or client). */
export function clientFiltersFromSearchParams(
  sp: Record<string, string | string[] | undefined> | URLSearchParams,
): ClientListFilters {
  const get = (key: string): string | undefined => {
    if (sp instanceof URLSearchParams) {
      return sp.get(key) ?? undefined;
    }
    const raw = sp[key];
    if (typeof raw === "string") return raw;
    if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
    return undefined;
  };

  const periodPreset = (get("period") ?? "all") as ClientPeriodPreset;
  const contactFilter = (get("contact") ?? "all") as ClientContactFilter;
  const orderFilter = (get("orders") ?? "all") as ClientOrderFilter;
  const sort = (get("sort") ?? "created") as ClientSort;

  const periodOk: ClientPeriodPreset[] = [
    "all",
    "today",
    "7d",
    "30d",
    "custom",
  ];
  const contactOk: ClientContactFilter[] = ["all", "whatsapp", "email"];
  const orderOk: ClientOrderFilter[] = ["all", "with_order", "without_order"];
  const sortOk: ClientSort[] = ["created", "updated", "name"];

  return {
    query: get("q") ?? "",
    periodPreset: periodOk.includes(periodPreset) ? periodPreset : "all",
    customFrom: get("from") ?? "",
    customTo: get("to") ?? "",
    contactFilter: contactOk.includes(contactFilter) ? contactFilter : "all",
    orderFilter: orderOk.includes(orderFilter) ? orderFilter : "all",
    sort: sortOk.includes(sort) ? sort : "created",
  };
}

/** Build /admin/clientes query string (omit defaults). */
export function buildClientesHref(
  filters: ClientListFilters,
  opts?: { page?: number; pageSize?: number },
): string {
  const params = new URLSearchParams();
  if (filters.query.trim()) params.set("q", filters.query.trim());
  if (filters.periodPreset !== "all") params.set("period", filters.periodPreset);
  if (filters.periodPreset === "custom") {
    if (filters.customFrom) params.set("from", filters.customFrom);
    if (filters.customTo) params.set("to", filters.customTo);
  }
  if (filters.contactFilter !== "all") {
    params.set("contact", filters.contactFilter);
  }
  if (filters.orderFilter !== "all") params.set("orders", filters.orderFilter);
  if (filters.sort !== "created") params.set("sort", filters.sort);
  if (opts?.page && opts.page > 1) params.set("page", String(opts.page));
  if (
    opts?.pageSize &&
    opts.pageSize !== PAGINATION.ADMIN_DEFAULT_PAGE_SIZE
  ) {
    params.set("pageSize", String(opts.pageSize));
  }
  const qs = params.toString();
  return qs ? `/admin/clientes?${qs}` : "/admin/clientes";
}

/** Date shown on each card — matches the active sort criterion. */
export function clientDisplayDate(
  c: Client,
  sort: ClientSort,
): { iso: string; label: "Cadastro" | "Atualizado" } {
  if (sort === "updated") {
    return { iso: c.atualizadoEm, label: "Atualizado" };
  }
  return { iso: c.criadoEm, label: "Cadastro" };
}

function sortClients(items: Client[], sort: ClientSort): Client[] {
  const copy = [...items];
  if (sort === "name") {
    copy.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    return copy;
  }
  if (sort === "created") {
    copy.sort(
      (a, b) =>
        b.criadoEm.localeCompare(a.criadoEm) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );
    return copy;
  }
  copy.sort(
    (a, b) =>
      b.atualizadoEm.localeCompare(a.atualizadoEm) ||
      a.nome.localeCompare(b.nome, "pt-BR"),
  );
  return copy;
}

export function filterAndSortClients(
  items: Client[],
  filters: ClientListFilters,
  orderClientIds: Set<string>,
  now: Date = new Date(),
): Client[] {
  const bounds = resolvePeriodBounds(
    filters.periodPreset,
    filters.customFrom,
    filters.customTo,
    now,
  );

  const filtered = items.filter((c) => {
    if (!matchesClientQuery(c, filters.query)) return false;

    if (bounds && !inPeriod(c.criadoEm, bounds.startIso, bounds.endIso)) {
      return false;
    }

    if (filters.contactFilter === "whatsapp" && !c.celular) return false;
    if (filters.contactFilter === "email" && !c.email) return false;

    const hasOrder = clientHasConfirmedOrder(c.id, orderClientIds);
    if (filters.orderFilter === "with_order" && !hasOrder) return false;
    if (filters.orderFilter === "without_order" && hasOrder) return false;

    return true;
  });

  return sortClients(filtered, filters.sort);
}
