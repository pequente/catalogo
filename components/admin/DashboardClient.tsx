"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { toastMutationError } from "@/components/admin/adminToast";
import { LoadingButton, Spinner } from "@/components/admin/LoadingButton";
import { ClientesPanel } from "@/components/admin/dashboard/ClientesPanel";
import { ProdutosPanel } from "@/components/admin/dashboard/ProdutosPanel";
import { ResumoPanel } from "@/components/admin/dashboard/ResumoPanel";
import { SitePanel } from "@/components/admin/dashboard/SitePanel";
import { VendasPanel } from "@/components/admin/dashboard/VendasPanel";
import {
  DASHBOARD_TABS,
  parseDashboardTab,
  type DashboardTabId,
} from "@/components/admin/dashboard/dashboardTabs";
import { BackToTopButton } from "@/components/ui/BackToTopButton";
import { apiClientErrorFromResponse } from "@/src/lib/api/client-error";
import type {
  DashboardPeriodPreset,
  DashboardStats,
} from "@/src/schemas/dashboard";

type DashboardPayload = DashboardStats & { preset?: DashboardPeriodPreset };

type Props = {
  initial: DashboardPayload;
};

const PRESETS: Array<{ id: DashboardPeriodPreset; label: string }> = [
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
  { id: "month", label: "Mês" },
  { id: "custom", label: "Personalizado" },
];

function formatBrDate(date: string): string {
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return date;
  return `${d}/${m}/${y}`;
}

export function DashboardClient({ initial }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stats, setStats] = useState(initial);
  const [preset, setPreset] = useState<DashboardPeriodPreset>(
    initial.preset ?? "7d",
  );
  const [customFrom, setCustomFrom] = useState(initial.period.from);
  const [customTo, setCustomTo] = useState(initial.period.to);
  const [tab, setTabState] = useState<DashboardTabId>(() =>
    parseDashboardTab(searchParams.get("dash")),
  );
  const [pending, startTransition] = useTransition();
  const [slowLoad, setSlowLoad] = useState(false);
  const { start, finish, fail } = useAdminBusy();
  const tabsId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const setTab = useCallback(
    (next: DashboardTabId) => {
      setTabState(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "resumo") {
        params.delete("dash");
      } else {
        params.set("dash", next);
      }
      const qs = params.toString();
      router.replace(qs ? `/admin?${qs}` : "/admin", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setTabState(parseDashboardTab(searchParams.get("dash")));
  }, [searchParams]);

  const load = useCallback(
    (nextPreset: DashboardPeriodPreset, from?: string, to?: string) => {
      startTransition(async () => {
        start({ label: "Carregando painel…" });
        const params = new URLSearchParams({ preset: nextPreset });
        if (nextPreset === "custom" && from && to) {
          params.set("from", from);
          params.set("to", to);
        }
        try {
          const res = await fetch(`/api/v1/admin/dashboard?${params}`);
          const data = (await res.json()) as DashboardPayload & {
            error?: { message?: string };
          };
          if (!res.ok) {
            toastMutationError(
              apiClientErrorFromResponse(
                res.status,
                data,
                "Falha ao carregar o painel",
              ),
              { id: "dashboard-load" },
            );
            fail();
            return;
          }
          setStats(data);
          if (data.period) {
            setCustomFrom(data.period.from);
            setCustomTo(data.period.to);
          }
          finish();
        } catch {
          toastMutationError(new Error("Falha ao carregar o painel"), {
            id: "dashboard-load",
          });
          fail();
        }
      });
    },
    [fail, finish, start],
  );

  useEffect(() => {
    setStats(initial);
  }, [initial]);

  useEffect(() => {
    if (!pending) {
      setSlowLoad(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowLoad(true), 1800);
    return () => window.clearTimeout(timer);
  }, [pending]);

  const focusTab = (index: number) => {
    const next = DASHBOARD_TABS[(index + DASHBOARD_TABS.length) % DASHBOARD_TABS.length];
    if (!next) return;
    setTab(next.id);
    tabRefs.current[(index + DASHBOARD_TABS.length) % DASHBOARD_TABS.length]?.focus();
  };

  const periodLabel =
    stats.period.from === stats.period.to
      ? formatBrDate(stats.period.from)
      : `${formatBrDate(stats.period.from)} → ${formatBrDate(stats.period.to)}`;

  const activeTabMeta = DASHBOARD_TABS.find((t) => t.id === tab);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <h1 className="admin-page__title">Painel</h1>
          <p className="admin-page__subtitle" aria-live="polite">
            <span>{periodLabel}</span>
            {pending ? (
              <span className="dash-status dash-status--busy">
                <Spinner className="dash-status__spinner" />
                <span>Atualizando dados…</span>
              </span>
            ) : null}
          </p>
          <p className="admin-page__hint dash-period-hint">
            Os números das abas usam o período selecionado abaixo, exceto em
            Produtos → Situação da loja agora (estoque e vitrine).
          </p>
        </div>
      </header>

      <div
        className="dash-toolbar"
        role="group"
        aria-label="Período"
        aria-busy={pending || undefined}
      >
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            disabled={pending}
            className={
              preset === p.id
                ? "dash-toolbar__btn dash-toolbar__btn--active"
                : "dash-toolbar__btn"
            }
            onClick={() => {
              setPreset(p.id);
              if (p.id !== "custom") load(p.id);
            }}
          >
            {p.label}
          </button>
        ))}
        {preset === "custom" ? (
          <div className="dash-toolbar__custom">
            <label>
              De
              <input
                type="date"
                value={customFrom}
                disabled={pending}
                onChange={(e) => setCustomFrom(e.target.value)}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                value={customTo}
                disabled={pending}
                onChange={(e) => setCustomTo(e.target.value)}
              />
            </label>
            <LoadingButton
              className="btn btn-dark"
              loading={pending}
              loadingLabel="Buscando…"
              onClick={() => load("custom", customFrom, customTo)}
            >
              Aplicar
            </LoadingButton>
          </div>
        ) : null}
      </div>

      {pending ? (
        <div className="dash-refresh-banner" role="status" aria-live="polite">
          <Spinner className="dash-refresh-banner__spinner" />
          <div className="dash-refresh-banner__copy">
            <strong>Carregando o painel</strong>
            <span>
              {slowLoad
                ? "Períodos longos podem levar alguns segundos. Os números atuais ficam visíveis até a atualização terminar."
                : "Buscando indicadores do período selecionado…"}
            </span>
          </div>
        </div>
      ) : null}

      <div
        className={
          pending
            ? "dash-tabs dash-tabs--dashboard dash-tabs--busy"
            : "dash-tabs dash-tabs--dashboard"
        }
        aria-busy={pending || undefined}
      >
        <div
          className="dash-tabs__list"
          role="tablist"
          aria-label="Seções do painel"
          onKeyDown={(e) => {
            const current = DASHBOARD_TABS.findIndex((t) => t.id === tab);
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              focusTab(current + 1);
            } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              focusTab(current - 1);
            } else if (e.key === "Home") {
              e.preventDefault();
              focusTab(0);
            } else if (e.key === "End") {
              e.preventDefault();
              focusTab(DASHBOARD_TABS.length - 1);
            }
          }}
        >
          {DASHBOARD_TABS.map((t, i) => {
            const selected = tab === t.id;
            return (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${tabsId}-tab-${t.id}`}
                aria-controls={`${tabsId}-panel-${t.id}`}
                aria-selected={selected}
                aria-label={t.label}
                tabIndex={selected ? 0 : -1}
                className={
                  selected
                    ? "dash-tabs__tab dash-tabs__tab--active"
                    : "dash-tabs__tab"
                }
                onClick={() => setTab(t.id)}
              >
                <span className="dash-tabs__label-full">{t.label}</span>
                <span className="dash-tabs__label-short">{t.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {activeTabMeta ? (
          <p className="dash-tab-subtitle" aria-live="polite">
            {activeTabMeta.subtitle}
          </p>
        ) : null}

        <div
          className="dash-tabs__panel"
          role="tabpanel"
          id={`${tabsId}-panel-resumo`}
          aria-labelledby={`${tabsId}-tab-resumo`}
          hidden={tab !== "resumo"}
        >
          <ResumoPanel
            stats={stats}
            preset={preset}
            onNavigateTab={setTab}
          />
        </div>

        <div
          className="dash-tabs__panel"
          role="tabpanel"
          id={`${tabsId}-panel-vendas`}
          aria-labelledby={`${tabsId}-tab-vendas`}
          hidden={tab !== "vendas"}
        >
          <VendasPanel stats={stats} />
        </div>

        <div
          className="dash-tabs__panel"
          role="tabpanel"
          id={`${tabsId}-panel-produtos`}
          aria-labelledby={`${tabsId}-tab-produtos`}
          hidden={tab !== "produtos"}
        >
          <ProdutosPanel stats={stats} />
        </div>

        <div
          className="dash-tabs__panel"
          role="tabpanel"
          id={`${tabsId}-panel-clientes`}
          aria-labelledby={`${tabsId}-tab-clientes`}
          hidden={tab !== "clientes"}
        >
          <ClientesPanel stats={stats} onNavigateTab={setTab} />
        </div>

        <div
          className="dash-tabs__panel"
          role="tabpanel"
          id={`${tabsId}-panel-site`}
          aria-labelledby={`${tabsId}-tab-site`}
          hidden={tab !== "site"}
        >
          <SitePanel stats={stats} onNavigateTab={setTab} />
        </div>
      </div>

      <BackToTopButton />
    </div>
  );
}
