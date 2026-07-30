"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageActions } from "@/components/admin/AdminPageActions";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { ClientCombobox } from "@/components/admin/ClientCombobox";
import { ProductOrderSearch } from "@/components/admin/ProductOrderSearch";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import {
  toastMutationError,
  toastMutationSuccess,
  toastMutationWarning,
} from "@/components/admin/adminToast";
import { formatBrl } from "@/src/lib/front/format";
import { variantSellPrice } from "@/src/lib/front/pricing";
import type { Client } from "@/src/schemas/client";
import type { Order, OrderCanal } from "@/src/schemas/order";
import type { Product, ProductVariant } from "@/src/schemas/product";
import { variantAttr } from "@/src/schemas/product";

type DraftLine = {
  key: string;
  produtoId: string;
  varianteId: string;
  quantidade: number;
  precoUnitario: number;
};

function newKey() {
  return crypto.randomUUID();
}

function linesFromOrder(order: Order): DraftLine[] {
  return order.itens.map((item) => ({
    key: newKey(),
    produtoId: item.produtoId,
    varianteId: item.varianteId,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
  }));
}

function emptyLine(): DraftLine {
  return {
    key: newKey(),
    produtoId: "",
    varianteId: "",
    quantidade: 1,
    precoUnitario: 0,
  };
}

export type PedidoInitialLine = {
  produtoId: string;
  varianteId: string;
  quantidade: number;
  precoUnitario: number;
};

function linesFromInitial(initial: PedidoInitialLine[]): DraftLine[] {
  return initial.map((item) => ({
    key: newKey(),
    produtoId: item.produtoId,
    varianteId: item.varianteId,
    quantidade: item.quantidade,
    precoUnitario: item.precoUnitario,
  }));
}

export function PedidoForm({
  order,
  products: seedProducts,
  clients,
  title,
  description,
  initialLines,
}: {
  order?: Order;
  /**
   * Seed only: products already on the order (or `?itens=` handoff).
   * Never the full catalog — typeahead loads more via paginated admin API.
   */
  products: Product[];
  clients: Client[];
  title?: string;
  description?: string;
  /** Linhas pré-preenchidas (ex.: handoff da redução de estoque no produto). */
  initialLines?: PedidoInitialLine[];
}) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const cancelled = order?.status === "cancelado";
  const [mode, setMode] = useState<"view" | "edit">(order ? "view" : "edit");
  const fieldsLocked = cancelled || (order != null && mode === "view");
  const canEdit = order != null && !cancelled && mode === "view";
  const canCancel = order != null && !cancelled;
  const fromStockDecrease =
    !order && initialLines != null && initialLines.length > 0;

  const displayTitle = cancelled
    ? "Pedido cancelado"
    : !order
      ? (title ?? "Novo pedido")
      : mode === "edit"
        ? "Editar pedido"
        : "Pedido";
  const displayDescription = cancelled
    ? "Registro histórico — estoque já estornado."
    : !order
      ? (description ??
        "Informe os itens vendidos para dar baixa no estoque. Cliente é opcional (loja física sem cadastro).")
      : mode === "edit"
        ? "Altere itens, canal ou cliente. O estoque é ajustado pela diferença."
        : "Consulte canal, cliente e itens. Clique em Editar para alterar.";

  const [canal, setCanal] = useState<OrderCanal>(order?.canal ?? "whatsapp");
  const [clienteId, setClienteId] = useState(order?.clienteId ?? "");
  const [observacao, setObservacao] = useState(order?.observacao ?? "");
  const [lines, setLines] = useState<DraftLine[]>(() => {
    if (order) return linesFromOrder(order);
    if (initialLines && initialLines.length > 0) {
      return linesFromInitial(initialLines);
    }
    return [emptyLine()];
  });
  const [versao, setVersao] = useState(order?.versao ?? 1);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const formId = useId();

  const [productCache, setProductCache] = useState<Map<string, Product>>(
    () => new Map(seedProducts.map((p) => [p.id, p])),
  );

  const productMap = productCache;

  function rememberProduct(product: Product) {
    setProductCache((prev) => {
      if (prev.get(product.id) === product) return prev;
      const next = new Map(prev);
      next.set(product.id, product);
      return next;
    });
  }

  /** Stock already reserved by this order (on disk), by variant key. */
  const reservedByOrder = useMemo(() => {
    const map = new Map<string, number>();
    if (!order || order.status !== "confirmado") return map;
    for (const item of order.itens) {
      const key = `${item.produtoId}:${item.varianteId}`;
      map.set(key, (map.get(key) ?? 0) + item.quantidade);
    }
    return map;
  }, [order]);

  function availableStock(produtoId: string, varianteId: string) {
    const product = productMap.get(produtoId);
    const variant = product?.variantes.find((v) => v.id === varianteId);
    if (!variant) return 0;
    const key = `${produtoId}:${varianteId}`;
    return variant.estoque + (reservedByOrder.get(key) ?? 0);
  }

  function variantStockLabel(produtoId: string, variante: ProductVariant) {
    const stock = fieldsLocked
      ? variante.estoque
      : variante.estoque +
        (reservedByOrder.get(`${produtoId}:${variante.id}`) ?? 0);
    const t = variantAttr(variante, "tamanho") ?? "—";
    const c = variantAttr(variante, "cor") ?? "—";
    return `${t} / ${c} (${stock} un.)`;
  }

  function resetFromOrder(next: Order) {
    setCanal(next.canal);
    setClienteId(next.clienteId ?? "");
    setObservacao(next.observacao ?? "");
    setLines(linesFromOrder(next));
    setVersao(next.versao);
  }

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = { ...line, ...patch };
        if (patch.produtoId !== undefined && patch.produtoId !== line.produtoId) {
          if (!patch.produtoId) {
            next.varianteId = "";
            next.precoUnitario = 0;
            next.quantidade = 1;
          } else {
            const product = productMap.get(patch.produtoId);
            const variant = product?.variantes[0];
            next.varianteId = variant?.id ?? "";
            next.precoUnitario = product
              ? variantSellPrice(product, variant)
              : 0;
            next.quantidade = 1;
          }
        } else if (
          patch.varianteId !== undefined &&
          patch.varianteId !== line.varianteId
        ) {
          const product = productMap.get(next.produtoId);
          if (product && patch.varianteId) {
            const variant = product.variantes.find(
              (v) => v.id === patch.varianteId,
            );
            next.precoUnitario = variantSellPrice(product, variant);
          }
        }
        return next;
      }),
    );
  }

  function selectProductForLine(lineKey: string, product: Product | null) {
    if (!product) {
      updateLine(lineKey, { produtoId: "", varianteId: "", precoUnitario: 0 });
      return;
    }
    rememberProduct(product);
    const variant = product.variantes[0];
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== lineKey) return line;
        return {
          ...line,
          produtoId: product.id,
          varianteId: variant?.id ?? "",
          precoUnitario: variantSellPrice(product, variant),
          quantidade: 1,
        };
      }),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => {
      const next = prev.filter((l) => l.key !== key);
      return next.length === 0 ? [emptyLine()] : next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  const total = lines.reduce(
    (sum, line) => sum + line.precoUnitario * line.quantidade,
    0,
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (fieldsLocked) return;

    const itens = lines
      .filter((l) => l.produtoId && l.varianteId && l.quantidade >= 1)
      .map((l) => ({
        produtoId: l.produtoId,
        varianteId: l.varianteId,
        quantidade: Math.floor(l.quantidade),
        precoUnitario: l.precoUnitario,
      }));

    if (itens.length === 0) {
      toastMutationWarning("Adicione ao menos um item", { id: "order-save" });
      return;
    }

    setSaving(true);
    try {
      await runMutation(
        { label: order ? "Atualizando pedido" : "Criando pedido" },
        async () => {
          if (order) {
            const res = await mutationFetch(`/api/v1/admin/orders/${order.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                versao,
                canal,
                clienteId: clienteId || null,
                observacao: observacao.trim() || undefined,
                itens,
              }),
            });
            const data = await res.json();
            assertMutationOk(res, data, "Erro ao salvar");
            const updated = data as Order;
            resetFromOrder(updated);
            setMode("view");
            router.refresh();
            toastMutationSuccess("Pedido atualizado.", { id: "order-save" });
          } else {
            const res = await mutationFetch("/api/v1/admin/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                canal,
                clienteId: clienteId || null,
                observacao: observacao.trim() || undefined,
                itens,
              }),
            });
            const data = await res.json();
            assertMutationOk(res, data, "Erro ao criar");
            const created = data as Order;
            router.refresh();
            router.push(`/admin/pedidos/${created.id}`);
            toastMutationSuccess("Pedido criado.", { id: "order-save" });
          }
        },
      );
    } catch (err) {
      toastMutationError(err, { id: "order-save" });
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder() {
    if (!order || cancelled) return;
    const ok = await confirm({
      title: "Cancelar pedido?",
      description:
        "O estoque das variantes será estornado. Esta ação não pode ser desfeita.",
      confirmLabel: "Cancelar pedido",
      tone: "danger",
    });
    if (!ok) return;
    setCancelling(true);
    try {
      await runMutation({ label: "Cancelando pedido" }, async () => {
        const res = await mutationFetch(
          `/api/v1/admin/orders/${order.id}/cancel`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versao }),
          },
        );
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao cancelar");
        router.refresh();
        router.push("/admin/pedidos");
        toastMutationSuccess("Pedido cancelado.", { id: "order-cancel" });
      });
    } catch (err) {
      toastMutationError(err, { id: "order-cancel" });
    } finally {
      setCancelling(false);
    }
  }

  // Catalog search is async — empty seedProducts is OK.

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <p className="admin-page__eyebrow">Vendas</p>
          <h1 className="admin-page__title">{displayTitle}</h1>
          <p className="admin-page__desc">{displayDescription}</p>
        </div>
        <AdminPageActions>
          <Link className="btn btn-ghost btn-sm" href="/admin/pedidos">
            Voltar
          </Link>
          {canCancel ? (
            <LoadingButton
              type="button"
              className="btn btn-ghost-danger btn-sm"
              loading={cancelling}
              loadingLabel="Cancelando…"
              onClick={cancelOrder}
              title="Estorna o estoque"
            >
              Cancelar pedido
            </LoadingButton>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setMode("edit")}
            >
              Editar
            </button>
          ) : null}
          {!fieldsLocked ? (
            <LoadingButton
              type="submit"
              form={formId}
              className="btn btn-primary btn-sm"
              loading={saving}
              loadingLabel="Salvando…"
            >
              Salvar
            </LoadingButton>
          ) : null}
        </AdminPageActions>
      </header>

      <form
        id={formId}
        className={`admin-form admin-form--sections${saving || cancelling ? " admin-form--busy" : ""}`}
        onSubmit={submit}
      >

        {fromStockDecrease ? (
          <p className="admin-alert" role="status">
            Itens pré-preenchidos a partir da redução de estoque do produto.
            Revise e confirme o pedido.
          </p>
        ) : null}

        {cancelled ? (
          <p className="admin-alert" role="status">
            Pedido cancelado — somente leitura. O estoque já foi estornado.
          </p>
        ) : null}

        <section className="admin-form__section">
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">Dados do pedido</h2>
            <p className="admin-form__section-desc">
              Canal da venda e cliente opcional (lead do WhatsApp).
            </p>
          </header>
          <div className="admin-form__section-body">
            <div className="admin-form__row admin-form__row--2">
              <label>
                <span className="admin-field-label">Canal</span>
                <select
                  className="select"
                  value={canal}
                  disabled={fieldsLocked}
                  onChange={(e) => setCanal(e.target.value as OrderCanal)}
                >
                  <option value="whatsapp">WhatsApp / catálogo</option>
                  <option value="loja_fisica">Loja física</option>
                </select>
              </label>
              <label>
                <span className="admin-field-label">Cliente (opcional)</span>
                <ClientCombobox
                  clients={clients}
                  value={clienteId}
                  onChange={setClienteId}
                  disabled={fieldsLocked}
                />
              </label>
            </div>
            <label className="admin-form__span">
              <span className="admin-field-label">Observação</span>
              <textarea
                className="textarea"
                rows={2}
                value={observacao}
                disabled={fieldsLocked}
                maxLength={2000}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: retirada na loja, cor alternativa…"
              />
            </label>
          </div>
        </section>

        <section className="admin-form__section">
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">Itens</h2>
            <p className="admin-form__section-desc">
              {fieldsLocked
                ? "Itens do pedido com preço snapshot."
                : "Cada linha baixa estoque da variante. Preço é snapshot (editável)."}
            </p>
          </header>
          <div className="admin-form__section-body">
            <div className="order-lines">
              {lines.map((line, index) => {
                const product = productMap.get(line.produtoId);
                const maxStock = availableStock(
                  line.produtoId,
                  line.varianteId,
                );
                const snapshotItem = order?.itens.find(
                  (item) =>
                    item.produtoId === line.produtoId &&
                    item.varianteId === line.varianteId,
                );
                const referenciaLabel =
                  (fieldsLocked
                    ? snapshotItem?.referenciaProduto?.trim()
                    : product?.referencia?.trim()) || null;
                return (
                  <article
                    key={line.key}
                    className="order-line"
                    aria-label={`Item ${index + 1}`}
                  >
                    <div className="order-line__fields">
                      <label className="order-line__field">
                        <span className="admin-field-label">Produto</span>
                        <ProductOrderSearch
                          value={line.produtoId}
                          selectedProduct={product ?? null}
                          disabled={fieldsLocked}
                          onSelect={(p) => selectProductForLine(line.key, p)}
                        />
                        {referenciaLabel ? (
                          <span className="product-cell__sub">
                            Ref. {referenciaLabel}
                          </span>
                        ) : null}
                      </label>
                      <label className="order-line__field">
                        <span className="admin-field-label">Variante</span>
                        <select
                          className="select input--sm"
                          value={line.varianteId}
                          disabled={fieldsLocked || !product}
                          onChange={(e) =>
                            updateLine(line.key, {
                              varianteId: e.target.value,
                            })
                          }
                        >
                          <option value="">
                            {product
                              ? "Selecione a variante"
                              : "Escolha um produto"}
                          </option>
                          {(product?.variantes ?? []).map((v) => {
                            const avail =
                              v.estoque +
                              (reservedByOrder.get(
                                `${line.produtoId}:${v.id}`,
                              ) ?? 0);
                            return (
                              <option
                                key={v.id}
                                value={v.id}
                                disabled={
                                  !fieldsLocked &&
                                  avail <= 0 &&
                                  v.id !== line.varianteId
                                }
                              >
                                {variantStockLabel(line.produtoId, v)}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                      <label className="order-line__field">
                        <span className="admin-field-label">Qtd</span>
                        <input
                          className="input input--sm input--narrow"
                          type="number"
                          min={1}
                          max={Math.max(1, maxStock)}
                          value={line.quantidade}
                          disabled={fieldsLocked}
                          onChange={(e) =>
                            updateLine(line.key, {
                              quantidade: Math.max(
                                1,
                                Math.floor(Number(e.target.value) || 1),
                              ),
                            })
                          }
                        />
                      </label>
                      <label className="order-line__field">
                        <span className="admin-field-label">Preço un.</span>
                        <input
                          className="input input--sm input--price"
                          type="number"
                          min={0}
                          step={0.01}
                          value={line.precoUnitario}
                          disabled={fieldsLocked}
                          onChange={(e) =>
                            updateLine(line.key, {
                              precoUnitario: Math.max(
                                0,
                                Number(e.target.value) || 0,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                    <div className="order-line__footer">
                      <div className="order-line__subtotal">
                        <span>Subtotal</span>
                        {formatBrl(line.precoUnitario * line.quantidade)}
                      </div>
                      {!fieldsLocked ? (
                        <button
                          type="button"
                          className="btn-quiet btn-quiet--danger"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length <= 1}
                        >
                          Remover
                        </button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="order-form__toolbar">
              {!fieldsLocked ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={addLine}
                >
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
                  Adicionar item
                </button>
              ) : (
                <span />
              )}
              <div className="order-form__total">
                <span className="order-form__total-label">Total</span>
                <strong className="order-form__total-value">
                  {formatBrl(total)}
                </strong>
              </div>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
