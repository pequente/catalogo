"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminNavRow } from "@/components/admin/AdminNavRow";
import { AdminPageActions } from "@/components/admin/AdminPageActions";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import { toastMutationError, toastMutationSuccess } from "@/components/admin/adminToast";
import { PaginationNav } from "@/components/ui/PaginationNav";
import { formatBrl } from "@/src/lib/front/format";
import {
  buildPageSizeSelectOptions,
  PAGE_SIZE_OPTIONS_ADMIN,
  PAGINATION,
} from "@/src/lib/pagination";
import type { Client } from "@/src/schemas/client";
import type { Order } from "@/src/schemas/order";

const CANAL_LABEL: Record<Order["canal"], string> = {
  whatsapp: "WhatsApp",
  loja_fisica: "Loja física",
};

const STATUS_LABEL: Record<Order["status"], string> = {
  confirmado: "Confirmado",
  cancelado: "Cancelado",
};

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

function orderTotal(order: Order) {
  return order.itens.reduce(
    (sum, item) => sum + item.precoUnitario * item.quantidade,
    0,
  );
}

function orderQty(order: Order) {
  return order.itens.reduce((sum, item) => sum + item.quantidade, 0);
}

function buildPedidosHref(opts: {
  page?: number;
  pageSize: number;
  status?: string;
  canal?: string;
}) {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.pageSize !== PAGINATION.ADMIN_DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(opts.pageSize));
  }
  if (opts.status) params.set("status", opts.status);
  if (opts.canal) params.set("canal", opts.canal);
  const qs = params.toString();
  return qs ? `/admin/pedidos?${qs}` : "/admin/pedidos";
}

export function PedidosClient({
  initialItems,
  clients,
  total,
  page,
  pageSize,
  statusFilter,
  canalFilter,
}: {
  initialItems: Order[];
  clients: Client[];
  total: number;
  page: number;
  pageSize: number;
  statusFilter: "" | Order["status"];
  canalFilter: "" | Order["canal"];
}) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const clientMap = useMemo(
    () => new Map(clients.map((c) => [c.id, c.nome])),
    [clients],
  );

  function navigateFilters(next: {
    status?: "" | Order["status"];
    canal?: "" | Order["canal"];
  }) {
    const href = buildPedidosHref({
      page: 1,
      pageSize,
      status: (next.status !== undefined ? next.status : statusFilter) || undefined,
      canal: (next.canal !== undefined ? next.canal : canalFilter) || undefined,
    });
    startTransition(() => {
      router.push(href);
    });
  }

  async function cancel(order: Order) {
    const ok = await confirm({
      title: "Cancelar pedido?",
      description:
        "O estoque das variantes será estornado. Esta ação não pode ser desfeita.",
      confirmLabel: "Cancelar pedido",
      tone: "danger",
    });
    if (!ok) return;
    setCancellingId(order.id);
    try {
      await runMutation({ label: "Cancelando pedido" }, async () => {
        const res = await mutationFetch(
          `/api/v1/admin/orders/${order.id}/cancel`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versao: order.versao }),
          },
        );
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao cancelar");
        router.refresh();
        toastMutationSuccess("Pedido cancelado.", { id: "order-cancel-list" });
      });
    } catch (err) {
      toastMutationError(err, { id: "order-cancel-list" });
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <p className="admin-page__eyebrow">Vendas</p>
          <h1 className="admin-page__title">Pedidos</h1>
          <p className="admin-page__desc">
            Registre vendas e dê baixa no estoque — pelo catálogo/WhatsApp ou
            na loja física.
          </p>
        </div>
        <AdminPageActions>
          <Link className="btn btn-primary btn-icon" href="/admin/pedidos/novo">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo pedido
          </Link>
        </AdminPageActions>
      </header>

      <section className="admin-panel" aria-label="Lista de pedidos">
        <div className="admin-panel__head">
          <h2>Registros</h2>
          <div className="admin-panel__filters">
            <label>
              <span className="admin-field-label">Status</span>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) =>
                  navigateFilters({
                    status: e.target.value as "" | Order["status"],
                  })
                }
              >
                <option value="">Todos</option>
                <option value="confirmado">Confirmado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </label>
            <label>
              <span className="admin-field-label">Canal</span>
              <select
                className="select"
                value={canalFilter}
                onChange={(e) =>
                  navigateFilters({
                    canal: e.target.value as "" | Order["canal"],
                  })
                }
              >
                <option value="">Todos</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="loja_fisica">Loja física</option>
              </select>
            </label>
            <span className="product-cell__sub">
              {total === 1 ? "1 pedido" : `${total} pedidos`}
            </span>
          </div>
        </div>

        {total === 0 ? (
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
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 12h6M9 16h4" />
              </svg>
            </span>
            <strong>Nenhum pedido</strong>
            <p>
              Crie um pedido para registrar a venda e baixar o estoque das
              variantes.
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Canal</th>
                    <th>Cliente</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {initialItems.map((order) => {
                    const clienteNome = order.clienteId
                      ? clientMap.get(order.clienteId)
                      : null;
                    return (
                      <AdminNavRow
                        key={order.id}
                        href={`/admin/pedidos/${order.id}`}
                        label={`Pedido de ${formatDate(order.criadoEm)}${
                          clienteNome ? ` — ${clienteNome}` : ""
                        }`}
                      >
                        <td>{formatDate(order.criadoEm)}</td>
                        <td>
                          <span className="tag-chip tag-chip--soft">
                            {CANAL_LABEL[order.canal]}
                          </span>
                        </td>
                        <td>{clienteNome ?? "—"}</td>
                        <td>
                          {orderQty(order)} un. · {order.itens.length}{" "}
                          {order.itens.length === 1 ? "linha" : "linhas"}
                        </td>
                        <td className="admin-table__price">
                          {formatBrl(orderTotal(order))}
                        </td>
                        <td>
                          <span
                            className={`status-pill status-pill--${order.status}`}
                          >
                            {STATUS_LABEL[order.status]}
                          </span>
                        </td>
                        <td>
                          <div className="admin-table__actions">
                            {order.status === "confirmado" ? (
                              <LoadingButton
                                type="button"
                                className="btn-quiet btn-quiet--danger"
                                loading={cancellingId === order.id}
                                loadingLabel="Cancelando…"
                                onClick={() => cancel(order)}
                              >
                                Cancelar pedido
                              </LoadingButton>
                            ) : null}
                          </div>
                        </td>
                      </AdminNavRow>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationNav
              page={page}
              pageSize={pageSize}
              total={total}
              label="Pedidos"
              hrefForPage={(p) =>
                buildPedidosHref({
                  page: p,
                  pageSize,
                  status: statusFilter || undefined,
                  canal: canalFilter || undefined,
                })
              }
              pageSizeOptions={buildPageSizeSelectOptions(
                PAGE_SIZE_OPTIONS_ADMIN,
                pageSize,
                (size) =>
                  buildPedidosHref({
                    page: 1,
                    pageSize: size,
                    status: statusFilter || undefined,
                    canal: canalFilter || undefined,
                  }),
              )}
            />
          </>
        )}
      </section>
    </div>
  );
}
