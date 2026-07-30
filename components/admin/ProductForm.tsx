"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageActions } from "@/components/admin/AdminPageActions";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { FieldHint } from "@/components/admin/FieldHint";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import {
  toastMutationError,
  toastMutationSuccess,
  toastMutationWarning,
} from "@/components/admin/adminToast";
import {
  ProductImageGallery,
  type ProductImageDraft,
} from "@/components/admin/ProductImageGallery";
import {
  ProductVariantsEditor,
  type ProductVariantDraft,
} from "@/components/admin/ProductVariantsEditor";
import { CategoryMultiSelect } from "@/components/admin/CategoryMultiSelect";
import { buildMutationFormData } from "@/components/admin/uploadClient";
import {
  CATEGORY_MAX_DEPTH,
  buildCategoryTree,
  depthUnderParent,
  flattenCategoryTree,
} from "@/src/lib/categories-tree";
import { formatBrl, maskBrlInput, parseBrlInput } from "@/src/lib/front/format";
import { categorySchema, type Category } from "@/src/schemas/category";
import { variantAttr, type Product } from "@/src/schemas/product";
import type { SiteDimensao } from "@/src/schemas/site-personalization";

function sortCategories(list: Category[]) {
  return [...list].sort(
    (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  );
}

type ProductTabId =
  | "dados"
  | "imagens"
  | "precos"
  | "variantes"
  | "vitrine";

const PRODUCT_TABS: Array<{ id: ProductTabId; label: string }> = [
  { id: "dados", label: "Dados" },
  { id: "imagens", label: "Imagens" },
  { id: "precos", label: "Preços" },
  { id: "variantes", label: "Variantes" },
  { id: "vitrine", label: "Vitrine" },
];

type Props = {
  product?: Product;
  categories: Category[];
  dimensoes?: SiteDimensao[];
};

function normalizeVariant(v: ProductVariantDraft): ProductVariantDraft | null {
  const atributos: Record<string, string> = {};
  for (const [key, val] of Object.entries(v.atributos ?? {})) {
    const t = val.trim();
    if (t) atributos[key] = t;
  }
  if (Object.keys(atributos).length === 0) return null;
  const preco =
    v.preco != null && Number.isFinite(v.preco) && v.preco >= 0
      ? v.preco
      : null;
  return {
    id: v.id,
    atributos,
    estoque: Math.max(0, Math.floor(Number(v.estoque) || 0)),
    preco,
    ...(v.sku ? { sku: v.sku } : {}),
  };
}

function draftFromProduct(product: Product) {
  return {
    nome: product.nome,
    descricao: product.descricao ?? "",
    referencia: product.referencia ?? "",
    preco: product.preco != null ? formatBrl(product.preco) : "",
    precoPromocional:
      product.precoPromocional != null
        ? formatBrl(product.precoPromocional)
        : "",
    categoriasIds: product.categoriasIds ?? [],
    status: product.status,
    destaque: product.destaque,
    lancamento: product.lancamento,
    variantes: product.variantes ?? [],
    imagens: product.imagens ?? [],
    versao: product.versao,
  };
}

type StockDecrease = {
  varianteId: string;
  tamanho: string;
  cor: string;
  from: number;
  to: number;
  qty: number;
};

function findStockDecreases(
  baseline: Product,
  draft: ProductVariantDraft[],
): StockDecrease[] {
  const byId = new Map(baseline.variantes.map((v) => [v.id, v]));
  const out: StockDecrease[] = [];
  for (const v of draft) {
    const prev = byId.get(v.id);
    if (!prev) continue;
    if (v.estoque < prev.estoque) {
      out.push({
        varianteId: v.id,
        tamanho: variantAttr(v, "tamanho") ?? "",
        cor: variantAttr(v, "cor") ?? "",
        from: prev.estoque,
        to: v.estoque,
        qty: prev.estoque - v.estoque,
      });
    }
  }
  return out;
}

export function ProductForm({ product, categories, dimensoes }: Props) {
  const router = useRouter();
  const { runMutation } = useAdminBusy();
  const { choose } = useConfirm();
  const [mode, setMode] = useState<"view" | "edit">(product ? "view" : "edit");
  /** Last persisted product — used to discard unsaved edits. */
  const [baseline, setBaseline] = useState(product);
  const fieldsLocked = baseline != null && mode === "view";
  const canEdit = baseline != null && mode === "view";

  const initial = product ? draftFromProduct(product) : null;
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [descricao, setDescricao] = useState(initial?.descricao ?? "");
  const [preco, setPreco] = useState(initial?.preco ?? "");
  const [precoPromocional, setPrecoPromocional] = useState(
    initial?.precoPromocional ?? "",
  );
  const [categoriasIds, setCategoriasIds] = useState<string[]>(
    initial?.categoriasIds ?? [],
  );
  const [categoryOptions, setCategoryOptions] = useState(() =>
    sortCategories(categories),
  );
  const [novaCategoriaNome, setNovaCategoriaNome] = useState("");
  const [novaCategoriaParentId, setNovaCategoriaParentId] = useState("");
  const [creatingCategoria, setCreatingCategoria] = useState(false);
  const [categoriaModalOpen, setCategoriaModalOpen] = useState(false);
  const categoriaModalTitleId = useId();
  const categoriaModalDescId = useId();
  const categoriaNomeInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initial?.status ?? "ativo");
  const [destaque, setDestaque] = useState(initial?.destaque ?? false);
  const [lancamento, setLancamento] = useState(initial?.lancamento ?? false);
  const [variantes, setVariantes] = useState<ProductVariantDraft[]>(
    initial?.variantes ?? [],
  );
  // Imagens novas ficam no client até o salvar (multipart + 1 commit).
  const [imagens, setImagens] = useState<ProductImageDraft[]>(
    initial?.imagens ?? [],
  );
  const [versao, setVersao] = useState(initial?.versao ?? 1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<ProductTabId>("dados");
  const tabsId = useId();
  const formId = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setCategoryOptions((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      for (const c of categories) byId.set(c.id, c);
      return sortCategories([...byId.values()]);
    });
  }, [categories]);

  const closeCategoriaModal = useCallback(() => {
    if (creatingCategoria) return;
    setCategoriaModalOpen(false);
    setNovaCategoriaNome("");
    setNovaCategoriaParentId("");
  }, [creatingCategoria]);

  useEffect(() => {
    if (!categoriaModalOpen) return;
    categoriaNomeInputRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !creatingCategoria) {
        e.preventDefault();
        closeCategoriaModal();
      }
    }

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [categoriaModalOpen, creatingCategoria, closeCategoriaModal]);

  const disabled = fieldsLocked || loading || creatingCategoria;

  const displayTitle = !baseline
    ? "Novo produto"
    : mode === "edit"
      ? "Editar produto"
      : "Produto";
  const displayDescription = !baseline
    ? "Preencha as informações básicas, fotos, preço e as combinações de tamanho e cor com estoque."
    : mode === "edit"
      ? "Atualize as informações, fotos, preço e as combinações de tamanho e cor com estoque."
      : "Consulte informações, fotos, preço e variantes. Clique em Editar para alterar.";

  function focusTab(index: number) {
    const next = PRODUCT_TABS[(index + PRODUCT_TABS.length) % PRODUCT_TABS.length];
    if (!next) return;
    setTab(next.id);
    tabRefs.current[(index + PRODUCT_TABS.length) % PRODUCT_TABS.length]?.focus();
  }

  function applyProduct(next: Product) {
    const draft = draftFromProduct(next);
    setNome(draft.nome);
    setReferencia(draft.referencia);
    setDescricao(draft.descricao);
    setPreco(draft.preco);
    setPrecoPromocional(draft.precoPromocional);
    setCategoriasIds(draft.categoriasIds);
    setStatus(draft.status);
    setDestaque(draft.destaque);
    setLancamento(draft.lancamento);
    setVariantes(draft.variantes);
    setImagens(draft.imagens);
    setVersao(draft.versao);
  }

  function cancelEdit() {
    if (!baseline) return;
    applyProduct(baseline);
    setCategoriaModalOpen(false);
    setNovaCategoriaNome("");
    setNovaCategoriaParentId("");
    setMode("view");
  }

  async function createCategoria() {
    const nomeTrim = novaCategoriaNome.trim();
    if (!nomeTrim || fieldsLocked || creatingCategoria) return;

    setCreatingCategoria(true);
    try {
      await runMutation({ label: "Salvando categoria" }, async () => {
        const res = await mutationFetch("/api/v1/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: nomeTrim,
            parentId: novaCategoriaParentId || null,
          }),
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao criar categoria");
        const created = categorySchema.safeParse(data);
        if (!created.success) {
          throw new Error("Categoria criada, mas a resposta foi inválida.");
        }
        setCategoryOptions((prev) =>
          sortCategories([
            ...prev.filter((c) => c.id !== created.data.id),
            created.data,
          ]),
        );
        setCategoriasIds((prev) =>
          prev.includes(created.data.id) ? prev : [...prev, created.data.id],
        );
        setNovaCategoriaNome("");
        setNovaCategoriaParentId("");
        setCategoriaModalOpen(false);
        router.refresh();
        toastMutationSuccess("Categoria criada.", { id: "product-modal-category" });
      });
    } catch (err) {
      toastMutationError(err, { id: "product-modal-category" });
    } finally {
      setCreatingCategoria(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (fieldsLocked) return;

    if (!nome.trim()) {
      setTab("dados");
      toastMutationWarning("Informe o nome do produto.", { id: "product-save" });
      return;
    }

    if (categoriasIds.length === 0) {
      setTab("dados");
      toastMutationWarning("Selecione pelo menos uma categoria.", {
        id: "product-save",
      });
      return;
    }

    const variantesNorm = variantes
      .map(normalizeVariant)
      .filter((v): v is ProductVariantDraft => v != null);

    if (variantesNorm.length === 0) {
      setTab("variantes");
      toastMutationWarning(
        "Adicione pelo menos uma variante com tamanho e cor preenchidos.",
        { id: "product-save" },
      );
      return;
    }

    const pendingFiles: { id: string; file: File }[] = [];
    const imagensPayload = imagens.map((img, ordem) => {
      if (img.file) {
        pendingFiles.push({ id: img.id, file: img.file });
        return {
          id: img.id,
          path: "",
          alt: img.alt?.trim() || undefined,
          ordem,
          pending: true as const,
        };
      }
      return {
        id: img.id,
        path: img.path,
        alt: img.alt?.trim() || undefined,
        ordem,
      };
    });

    const precoNum = parseBrlInput(preco);
    if (precoNum == null) {
      setTab("precos");
      toastMutationWarning("Informe o preço do produto.", { id: "product-save" });
      return;
    }

    if (baseline) {
      const decreases = findStockDecreases(baseline, variantesNorm);
      if (decreases.length > 0) {
        const lines = decreases
          .map(
            (d) =>
              `• ${d.tamanho} · ${d.cor}: ${d.from} → ${d.to} (−${d.qty})`,
          )
          .join("\n");
        const decision = await choose({
          title: "Redução de estoque sem pedido",
          description: `${lines}\n\nPara vendas, preferimos criar um pedido — assim a baixa fica rastreável.\n\n“Ir criar pedido” cancela este salvamento e descarta as alterações não salvas do produto.`,
          primaryLabel: "Ir criar pedido",
          secondaryLabel: "Salvar mesmo assim",
          cancelLabel: "Voltar",
        });
        if (decision === "cancel") return;
        if (decision === "primary") {
          const params = new URLSearchParams();
          params.set(
            "itens",
            decreases
              .map((d) => `${baseline.id}:${d.varianteId}:${d.qty}`)
              .join(","),
          );
          router.push(`/admin/pedidos/novo?${params.toString()}`);
          return;
        }
      }
    }

    const payload = {
      nome,
      referencia: referencia.trim(),
      descricao,
      preco: precoNum,
      precoPromocional: parseBrlInput(precoPromocional),
      categoriasIds,
      status,
      destaque,
      lancamento,
      variantes: variantesNorm,
      imagens: imagensPayload,
      ...(baseline ? { versao } : {}),
    };

    const hasUploads = pendingFiles.length > 0;
    setLoading(true);
    try {
      await runMutation(
        {
          label: "Salvando produto",
          determinate: hasUploads,
        },
        async ({ setProgress }) => {
          const body = buildMutationFormData(payload, pendingFiles);
          const res = await mutationFetch(
            baseline
              ? `/api/v1/admin/products/${baseline.id}`
              : "/api/v1/admin/products",
            {
              method: baseline ? "PATCH" : "POST",
              body,
            },
            {
              onUploadProgress: hasUploads ? setProgress : undefined,
            },
          );
          const data = await res.json();
          assertMutationOk(res, data, "Erro ao salvar");
          const saved = data as Product;
          if (baseline) {
            setBaseline(saved);
            applyProduct(saved);
            setMode("view");
            router.refresh();
            toastMutationSuccess("Produto salvo.", { id: "product-save" });
          } else {
            router.refresh();
            router.push(`/admin/produtos/${saved.id}`);
            toastMutationSuccess("Produto criado.", { id: "product-save" });
          }
        },
      );
    } catch (err) {
      toastMutationError(err, { id: "product-save" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <h1 className="admin-page__title">{displayTitle}</h1>
          <p className="admin-page__desc">{displayDescription}</p>
        </div>
        <AdminPageActions>
          {canEdit ? (
            <>
              <Link className="btn btn-ghost btn-sm" href="/admin/produtos">
                Voltar
              </Link>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setMode("edit")}
              >
                Editar
              </button>
            </>
          ) : (
            <>
              {baseline && mode === "edit" ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={cancelEdit}
                  disabled={loading}
                >
                  Cancelar
                </button>
              ) : (
                <Link className="btn btn-ghost btn-sm" href="/admin/produtos">
                  Voltar
                </Link>
              )}
              {!fieldsLocked ? (
                <LoadingButton
                  className="btn btn-primary btn-sm"
                  type="submit"
                  form={formId}
                  loading={loading}
                  loadingLabel="Salvando…"
                >
                  Salvar
                </LoadingButton>
              ) : null}
            </>
          )}
        </AdminPageActions>
      </header>

      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        className={[
          "admin-form",
          "admin-form--sections",
          loading ? "admin-form--busy" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-busy={loading || undefined}
      >
        <section className="admin-form__section admin-form__span">
          <div className="dash-tabs">
            <div
              className="dash-tabs__list"
              role="tablist"
              aria-label="Seções do produto"
              onKeyDown={(e) => {
                const current = PRODUCT_TABS.findIndex((t) => t.id === tab);
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
                  focusTab(PRODUCT_TABS.length - 1);
                }
              }}
            >
              {PRODUCT_TABS.map((t, i) => {
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
                    tabIndex={selected ? 0 : -1}
                    className={
                      selected
                        ? "dash-tabs__tab dash-tabs__tab--active"
                        : "dash-tabs__tab"
                    }
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div
              className="dash-tabs__panel"
              role="tabpanel"
              id={`${tabsId}-panel-dados`}
              aria-labelledby={`${tabsId}-tab-dados`}
              hidden={tab !== "dados"}
            >
              <div className="admin-form__section-body">
                <label className="admin-form__span">
                  <span className="admin-field-label">Nome</span>
                  <input
                    className="input"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={disabled}
                    placeholder="Ex.: Tênis Runner Pro"
                  />
                </label>

                <label className="admin-form__span">
                  <span className="admin-field-label">
                    Referência
                    <FieldHint text="Código auxiliar para controle interno. Opcional; se preenchida, deve ser única na loja." />
                  </span>
                  <input
                    className="input"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    disabled={disabled}
                    maxLength={80}
                    placeholder="Ex.: 12425"
                  />
                </label>

                <label className="admin-form__span">
                  <span className="admin-field-label">
                    Descrição
                    <FieldHint text="Texto livre sobre o produto. Pode ficar em branco." />
                  </span>
                  <textarea
                    className="textarea"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    rows={4}
                    disabled={disabled}
                    placeholder="Conte um pouco sobre o produto…"
                  />
                </label>

                <div
                  className="admin-form__span"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <span className="admin-field-label">
                    Categorias
                    <FieldHint text="Busque e selecione uma ou mais. Remova pelo × no chip. Use Nova categoria para cadastrar sem sair do produto." />
                  </span>
                  {categoryOptions.length === 0 ? (
                    <p className="product-cell__sub" style={{ margin: 0 }}>
                      Nenhuma categoria ainda. Use Nova categoria para criar a
                      primeira.
                    </p>
                  ) : (
                    <CategoryMultiSelect
                      categories={categoryOptions}
                      value={categoriasIds}
                      onChange={setCategoriasIds}
                      disabled={disabled}
                    />
                  )}
                  {!fieldsLocked ? (
                    <div>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm btn-icon"
                        disabled={disabled}
                        onClick={() => {
                          setCategoriaModalOpen(true);
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.25"
                          strokeLinecap="round"
                          aria-hidden
                        >
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                        Nova categoria
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div
              className="dash-tabs__panel"
              role="tabpanel"
              id={`${tabsId}-panel-imagens`}
              aria-labelledby={`${tabsId}-tab-imagens`}
              hidden={tab !== "imagens"}
            >
              <div className="admin-form__section-body">
                <ProductImageGallery
                  images={imagens}
                  onChange={setImagens}
                  disabled={disabled}
                />
              </div>
            </div>

            <div
              className="dash-tabs__panel"
              role="tabpanel"
              id={`${tabsId}-panel-precos`}
              aria-labelledby={`${tabsId}-tab-precos`}
              hidden={tab !== "precos"}
            >
              <header className="admin-form__section-header">
                <p className="admin-form__section-desc">
                  Valor cobrado na loja. Promoção é opcional.
                </p>
              </header>
              <div className="admin-form__section-body admin-form__row admin-form__row--2">
                <label>
                  <span className="admin-field-label">Preço</span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={preco}
                    onChange={(e) => setPreco(maskBrlInput(e.target.value))}
                    required
                    disabled={disabled}
                    placeholder="R$ 0,00"
                  />
                </label>
                <label>
                  <span className="admin-field-label">
                    Preço promocional
                    <FieldHint text="Opcional. Se preencher, o preço normal aparece riscado na loja." />
                  </span>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={precoPromocional}
                    onChange={(e) =>
                      setPrecoPromocional(maskBrlInput(e.target.value))
                    }
                    disabled={disabled}
                    placeholder="Deixe vazio se não houver"
                  />
                </label>
              </div>
            </div>

            <div
              className="dash-tabs__panel"
              role="tabpanel"
              id={`${tabsId}-panel-variantes`}
              aria-labelledby={`${tabsId}-tab-variantes`}
              hidden={tab !== "variantes"}
            >
              <div className="admin-form__section-body">
                <ProductVariantsEditor
                  variantes={variantes}
                  onChange={setVariantes}
                  dimensoes={dimensoes}
                  baselineVariantes={baseline?.variantes}
                  disabled={disabled}
                />
              </div>
            </div>

            <div
              className="dash-tabs__panel"
              role="tabpanel"
              id={`${tabsId}-panel-vitrine`}
              aria-labelledby={`${tabsId}-tab-vitrine`}
              hidden={tab !== "vitrine"}
            >
              <header className="admin-form__section-header">
                <p className="admin-form__section-desc">
                  Controle se o produto está visível e se merece destaque.
                </p>
              </header>
              <div className="admin-form__section-body">
                <label>
                  <span className="admin-field-label">Status</span>
                  <select
                    className="select"
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as Product["status"])
                    }
                    disabled={disabled}
                  >
                    <option value="ativo">Visível</option>
                    <option value="oculto">Oculto na loja</option>
                    <option value="esgotado">Esgotado</option>
                  </select>
                </label>

                <div className="admin-form__checks">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={destaque}
                      onChange={(e) => setDestaque(e.target.checked)}
                      disabled={disabled}
                    />
                    <span>
                      <strong>Destaque</strong>
                      <small>Aparece nas seções principais da vitrine</small>
                    </span>
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={lancamento}
                      onChange={(e) => setLancamento(e.target.checked)}
                      disabled={disabled}
                    />
                    <span>
                      <strong>Lançamento</strong>
                      <small>Marca o produto como novidade</small>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>
      </form>

      {categoriaModalOpen ? (
        <div
          className="confirm-dialog"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeCategoriaModal();
          }}
        >
          <div
            className="confirm-dialog__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={categoriaModalTitleId}
            aria-describedby={categoriaModalDescId}
          >
            <h2 id={categoriaModalTitleId} className="confirm-dialog__title">
              Nova categoria
            </h2>
            <p id={categoriaModalDescId} className="confirm-dialog__desc">
              Cadastre uma categoria para organizar o produto. O slug é gerado
              automaticamente.
            </p>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                marginTop: "1rem",
              }}
            >
              <span className="admin-field-label">Nome</span>
              <input
                ref={categoriaNomeInputRef}
                className="input"
                placeholder="Ex.: Infantil, Acessórios…"
                value={novaCategoriaNome}
                onChange={(e) => setNovaCategoriaNome(e.target.value)}
                disabled={creatingCategoria}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createCategoria();
                  }
                }}
              />
            </label>
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
                marginTop: "0.75rem",
              }}
            >
              <span className="admin-field-label">Categoria pai (opcional)</span>
              <select
                className="input"
                value={novaCategoriaParentId}
                onChange={(e) => setNovaCategoriaParentId(e.target.value)}
                disabled={creatingCategoria}
                aria-label="Categoria pai"
              >
                <option value="">Sem categoria pai</option>
                {flattenCategoryTree(buildCategoryTree(categoryOptions))
                  .filter(
                    ({ category: c }) =>
                      depthUnderParent(c.id, categoryOptions) <=
                      CATEGORY_MAX_DEPTH,
                  )
                  .map(({ category: c, depth }) => (
                    <option key={c.id} value={c.id}>
                      {"— ".repeat(depth)}
                      {c.nome}
                    </option>
                  ))}
              </select>
            </label>
            <div className="confirm-dialog__actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={closeCategoriaModal}
                disabled={creatingCategoria}
              >
                Cancelar
              </button>
              <LoadingButton
                className="btn btn-dark"
                type="button"
                loading={creatingCategoria}
                loadingLabel="Salvando…"
                disabled={!novaCategoriaNome.trim()}
                onClick={() => void createCategoria()}
              >
                Adicionar
              </LoadingButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
