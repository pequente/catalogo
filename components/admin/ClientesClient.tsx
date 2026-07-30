"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import { toastMutationError, toastMutationSuccess } from "@/components/admin/adminToast";
import { PaginationNav } from "@/components/ui/PaginationNav";
import {
  buildPageSizeSelectOptions,
  PAGE_SIZE_OPTIONS_ADMIN,
} from "@/src/lib/pagination";
import {
  CLIENT_SORT_OPTIONS,
  buildClientesHref,
  clientDisplayDate,
  clientListFiltersActive,
  DEFAULT_CLIENT_LIST_FILTERS,
  type ClientContactFilter,
  type ClientListFilters,
  type ClientOrderFilter,
  type ClientPeriodPreset,
  type ClientSort,
} from "@/src/lib/front/client-filter";
import type { Client } from "@/src/schemas/client";
import { formatBrWhatsApp } from "@/src/lib/wa";

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCount(filtered: number, total: number) {
  if (total === 0) return "0 clientes";
  if (filtered === total) {
    return total === 1 ? "1 cliente" : `${total} clientes`;
  }
  const totalLabel = total === 1 ? "1 cliente" : `${total} clientes`;
  const filteredLabel = filtered === 1 ? "1" : String(filtered);
  return `${filteredLabel} de ${totalLabel}`;
}

export function ClientesClient({
  initialItems,
  filters,
  total,
  catalogTotal,
  page,
  pageSize,
}: {
  initialItems: Client[];
  /** Kept for API compatibility — filtering happens on the server. */
  orderClientIds: string[];
  filters: ClientListFilters;
  total: number;
  catalogTotal: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [queryDraft, setQueryDraft] = useState(filters.query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQueryDraft(filters.query);
  }, [filters.query]);

  const filtersActive = clientListFiltersActive(filters);

  function navigate(next: ClientListFilters, nextPage = 1) {
    const href = buildClientesHref(next, { page: nextPage, pageSize });
    startTransition(() => {
      router.push(href);
    });
  }

  function patchFilters(patch: Partial<ClientListFilters>) {
    navigate({ ...filters, ...patch }, 1);
  }

  function clearFilters() {
    setQueryDraft("");
    navigate(DEFAULT_CLIENT_LIST_FILTERS, 1);
  }

  async function remove(id: string, nome: string) {
    const ok = await confirm({
      title: "Excluir cliente?",
      description: `Remover ${nome} da lista de contatos capturados.`,
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await runMutation({ label: "Excluindo cliente" }, async () => {
        const res = await mutationFetch(`/api/v1/admin/clientes/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao excluir");
        router.refresh();
        toastMutationSuccess("Cliente excluído.", { id: "client-delete" });
      });
    } catch (err) {
      toastMutationError(err, { id: "client-delete" });
    } finally {
      setDeletingId(null);
    }
  }

  const showFilters = catalogTotal > 0;

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <p className="admin-page__eyebrow">Contatos</p>
          <h1 className="admin-page__title">Clientes</h1>
          <p className="admin-page__desc">
            Contatos capturados ao clicar no WhatsApp na vitrine.
          </p>
        </div>
      </header>

      <section className="admin-panel" aria-label="Lista de clientes">
        <div className="admin-panel__head">
          <h2>Cadastrados</h2>
          <span>{formatCount(total, catalogTotal)}</span>
        </div>

        {showFilters ? (
          <div className="admin-panel__filters admin-panel__filters--bar">
            <form
              className="admin-filter-field admin-filter-field--search"
              onSubmit={(e) => {
                e.preventDefault();
                patchFilters({ query: queryDraft });
              }}
            >
              <span className="admin-filter-field__label">Buscar</span>
              <span className="admin-filter-field__control admin-filter-field__control--search">
                <svg
                  className="admin-filter-field__icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  className="input"
                  type="search"
                  placeholder="Nome, e-mail ou telefone"
                  value={queryDraft}
                  onChange={(e) => setQueryDraft(e.target.value)}
                  autoComplete="off"
                />
              </span>
            </form>
            <label className="admin-filter-field">
              <span className="admin-filter-field__label">Período</span>
              <span className="admin-filter-field__control">
                <select
                  className="select"
                  value={filters.periodPreset}
                  onChange={(e) =>
                    patchFilters({
                      periodPreset: e.target.value as ClientPeriodPreset,
                    })
                  }
                >
                  <option value="all">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="7d">Últimos 7 dias</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="custom">Personalizado</option>
                </select>
              </span>
            </label>
            {filters.periodPreset === "custom" ? (
              <>
                <label className="admin-filter-field admin-filter-field--date">
                  <span className="admin-filter-field__label">De</span>
                  <span className="admin-filter-field__control">
                    <input
                      className="input"
                      type="date"
                      value={filters.customFrom}
                      onChange={(e) =>
                        patchFilters({ customFrom: e.target.value })
                      }
                    />
                  </span>
                </label>
                <label className="admin-filter-field admin-filter-field--date">
                  <span className="admin-filter-field__label">Até</span>
                  <span className="admin-filter-field__control">
                    <input
                      className="input"
                      type="date"
                      value={filters.customTo}
                      onChange={(e) =>
                        patchFilters({ customTo: e.target.value })
                      }
                    />
                  </span>
                </label>
              </>
            ) : null}
            <label className="admin-filter-field">
              <span className="admin-filter-field__label">Contato</span>
              <span className="admin-filter-field__control">
                <select
                  className="select"
                  value={filters.contactFilter}
                  onChange={(e) =>
                    patchFilters({
                      contactFilter: e.target.value as ClientContactFilter,
                    })
                  }
                >
                  <option value="all">Todos</option>
                  <option value="whatsapp">Com WhatsApp</option>
                  <option value="email">Com e-mail</option>
                </select>
              </span>
            </label>
            <label className="admin-filter-field">
              <span className="admin-filter-field__label">Pedidos</span>
              <span className="admin-filter-field__control">
                <select
                  className="select"
                  value={filters.orderFilter}
                  onChange={(e) =>
                    patchFilters({
                      orderFilter: e.target.value as ClientOrderFilter,
                    })
                  }
                >
                  <option value="all">Todos</option>
                  <option value="with_order">Com pedido</option>
                  <option value="without_order">Sem pedido</option>
                </select>
              </span>
            </label>
            <label className="admin-filter-field">
              <span className="admin-filter-field__label">Ordenar</span>
              <span className="admin-filter-field__control">
                <select
                  className="select"
                  value={filters.sort}
                  onChange={(e) =>
                    patchFilters({ sort: e.target.value as ClientSort })
                  }
                >
                  {CLIENT_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            {filtersActive ? (
              <button
                type="button"
                className="admin-filter-clear"
                onClick={clearFilters}
              >
                Limpar filtros
              </button>
            ) : null}
          </div>
        ) : null}

        {catalogTotal === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty__icon" aria-hidden>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <strong>Nenhum cliente ainda</strong>
            <p>
              Quando alguém clicar no WhatsApp no site e preencher o cadastro,
              aparece aqui.
            </p>
          </div>
        ) : total === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty__icon" aria-hidden>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </span>
            <strong>Nenhum cliente com esses filtros</strong>
            <p>Tente outra busca ou limpe os filtros para ver todos os contatos.</p>
            <button type="button" className="btn btn-quiet" onClick={clearFilters}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <>
            <ul className="client-list">
              {initialItems.map((c) => {
                const when = clientDisplayDate(c, filters.sort);
                return (
                  <li key={c.id} className="client-card">
                    <div className="client-card__top">
                      <div className="client-card__identity">
                        <span className="client-card__avatar" aria-hidden>
                          {initials(c.nome)}
                        </span>
                        <div className="client-card__who">
                          <span className="client-card__name">{c.nome}</span>
                          <time
                            className="client-card__when"
                            dateTime={when.iso}
                            title={`${when.label}: ${formatDate(when.iso)}`}
                          >
                            <span className="client-card__when-kind">
                              {when.label}
                            </span>
                            {formatDate(when.iso)}
                          </time>
                        </div>
                      </div>
                      <LoadingButton
                        type="button"
                        className="btn-quiet btn-quiet--danger btn-icon client-card__delete"
                        onClick={() => remove(c.id, c.nome)}
                        loading={deletingId === c.id}
                        loadingLabel="Excluindo…"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4h8v2" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                        <span className="client-card__delete-label">Excluir</span>
                      </LoadingButton>
                    </div>

                    <dl className="client-card__fields">
                      {c.celular ? (
                        <div className="client-card__field">
                          <dt>WhatsApp</dt>
                          <dd>
                            <a
                              href={`https://wa.me/55${c.celular}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {formatBrWhatsApp(c.celular)}
                            </a>
                          </dd>
                        </div>
                      ) : null}
                      {c.email ? (
                        <div className="client-card__field">
                          <dt>E-mail</dt>
                          <dd>
                            <a href={`mailto:${c.email}`}>{c.email}</a>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </li>
                );
              })}
            </ul>
            <PaginationNav
              page={page}
              pageSize={pageSize}
              total={total}
              label="Clientes"
              hrefForPage={(p) =>
                buildClientesHref(filters, { page: p, pageSize })
              }
              pageSizeOptions={buildPageSizeSelectOptions(
                PAGE_SIZE_OPTIONS_ADMIN,
                pageSize,
                (size) =>
                  buildClientesHref(filters, { page: 1, pageSize: size }),
              )}
            />
          </>
        )}
      </section>
    </div>
  );
}
