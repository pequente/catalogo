"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState } from "react";
import { AdminPageActions } from "@/components/admin/AdminPageActions";
import { useAdminBusy } from "@/components/admin/AdminBusy";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { LoadingButton } from "@/components/admin/LoadingButton";
import { mutationFetch, assertMutationOk } from "@/components/admin/mutationFetch";
import {
  toastMutationError,
  toastMutationSuccess,
} from "@/components/admin/adminToast";
import {
  CATEGORY_MAX_DEPTH,
  buildCategoryTree,
  depthUnderParent,
  flattenCategoryTree,
  hasInactiveAncestor,
} from "@/src/lib/categories-tree";
import { categorySchema, type Category } from "@/src/schemas/category";

function initials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function sortCategories(list: Category[]) {
  return [...list].sort(
    (a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome),
  );
}

export function CategoriasClient({
  initialItems,
}: {
  initialItems: Category[];
}) {
  const router = useRouter();
  const { confirm } = useConfirm();
  const { runMutation } = useAdminBusy();
  const [items, setItems] = useState<Category[]>(initialItems);
  const [nome, setNome] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const formId = useId();

  const flatTree = useMemo(
    () => flattenCategoryTree(buildCategoryTree(items)),
    [items],
  );

  const parentOptions = useMemo(
    () =>
      items.filter(
        (c) => depthUnderParent(c.id, items) <= CATEGORY_MAX_DEPTH,
      ),
    [items],
  );

  async function load() {
    const res = await fetch("/api/v1/admin/categories");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await runMutation({ label: "Salvando categoria" }, async () => {
        const res = await mutationFetch("/api/v1/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome,
            parentId: parentId || null,
          }),
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao criar categoria");
        const created = categorySchema.safeParse(data);
        if (created.success) {
          setItems((prev) =>
            sortCategories([
              ...prev.filter((c) => c.id !== created.data.id),
              created.data,
            ]),
          );
        }
        setNome("");
        setParentId("");
        await load();
        router.refresh();
        toastMutationSuccess("Categoria criada.", { id: "category-create" });
      });
    } catch (err) {
      toastMutationError(err, { id: "category-create" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(c: Category) {
    if (hasInactiveAncestor(c, items)) return;
    setTogglingId(c.id);
    try {
      await runMutation(
        { label: c.ativo ? "Inativando categoria" : "Ativando categoria" },
        async () => {
          const res = await mutationFetch(`/api/v1/admin/categories/${c.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versao: c.versao, ativo: !c.ativo }),
          });
          const data = await res.json();
          assertMutationOk(res, data, "Erro ao atualizar categoria");
          const updated = categorySchema.safeParse(data);
          if (updated.success) {
            setItems((prev) =>
              sortCategories([
                ...prev.filter((x) => x.id !== updated.data.id),
                updated.data,
              ]),
            );
          }
          await load();
          router.refresh();
        },
      );
    } catch (err) {
      toastMutationError(err, { id: "category-toggle" });
    } finally {
      setTogglingId(null);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Excluir categoria?",
      description:
        "Esta ação não pode ser desfeita. Subcategorias devem ser removidas antes.",
      confirmLabel: "Excluir",
      tone: "danger",
    });
    if (!ok) return;
    setDeletingId(id);
    try {
      await runMutation({ label: "Excluindo categoria" }, async () => {
        const res = await mutationFetch(`/api/v1/admin/categories/${id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        assertMutationOk(res, data, "Erro ao excluir");
        setItems((prev) => prev.filter((c) => c.id !== id));
        await load();
        router.refresh();
        toastMutationSuccess("Categoria excluída.", { id: "category-delete" });
      });
    } catch (err) {
      toastMutationError(err, { id: "category-delete" });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <p className="admin-page__eyebrow">Organização</p>
          <h1 className="admin-page__title">Categorias</h1>
          <p className="admin-page__desc">
            Organize em até {CATEGORY_MAX_DEPTH} níveis — por exemplo Adulto ›
            Masc › Tênis.
          </p>
        </div>
        <AdminPageActions>
          <LoadingButton
            className="btn btn-primary btn-icon btn-sm"
            type="submit"
            form={formId}
            loading={saving}
            loadingLabel="Salvando…"
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
            Adicionar
          </LoadingButton>
        </AdminPageActions>
      </header>

      <section className="admin-panel" aria-label="Nova categoria">
        <div className="admin-panel__head">
          <h2>Adicionar categoria</h2>
          <span>Slug automático</span>
        </div>
        <div className="admin-panel__body">
          <form
            id={formId}
            className="admin-form-bar admin-form-bar--stack category-create-form"
            onSubmit={create}
          >
            <label className="category-create-form__field">
              <span className="admin-field-label">Nome</span>
              <input
                className="input"
                placeholder="Ex.: Infantil, Acessórios…"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={saving}
              />
            </label>
            <label className="category-create-form__field">
              <span className="admin-field-label">Categoria pai</span>
              <select
                className="input"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={saving}
              >
                <option value="">Sem categoria pai</option>
                {parentOptions.map((c) => {
                  const row = flatTree.find((r) => r.category.id === c.id);
                  const pad = "— ".repeat(row?.depth ?? 0);
                  return (
                    <option key={c.id} value={c.id}>
                      {pad}
                      {c.nome}
                    </option>
                  );
                })}
              </select>
            </label>
          </form>
        </div>
      </section>

      <section className="admin-panel" aria-label="Lista de categorias">
        <div className="admin-panel__head">
          <h2>Cadastradas</h2>
          <span>
            {items.length === 1
              ? "1 categoria"
              : `${items.length} categorias`}
          </span>
        </div>

        {items.length === 0 ? (
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
                <path d="M4 7h6v6H4V7Z" />
                <path d="M14 7h6v6h-6V7Z" />
                <path d="M4 17h6v3H4v-3Z" />
                <path d="M14 17h6v3h-6v-3Z" />
              </svg>
            </span>
            <strong>Nenhuma categoria</strong>
            <p>Crie a primeira para organizar os produtos da vitrine.</p>
          </div>
        ) : (
          <ul className="category-list">
            {flatTree.map(({ category: c, depth }) => {
              const busy = togglingId === c.id || deletingId === c.id;
              const lockedByParent = hasInactiveAncestor(c, items);
              const switchDisabled = saving || busy || lockedByParent;
              return (
                <li
                  key={c.id}
                  className="category-item"
                  data-depth={depth}
                  data-inactive={c.ativo ? undefined : "true"}
                  data-locked-by-parent={
                    lockedByParent ? "true" : undefined
                  }
                  title={
                    lockedByParent
                      ? "Categoria pai inativa — ative o pai para alterar o status desta subcategoria"
                      : undefined
                  }
                >
                  <div
                    className="category-item__indent"
                    aria-hidden
                    style={{ ["--cat-depth" as string]: depth }}
                  />
                  <div className="category-item__body">
                    <div className="category-item__top">
                      <div className="category-item__main">
                        <span className="category-item__mark" aria-hidden>
                          {initials(c.nome)}
                        </span>
                        <div className="category-item__text">
                          <span className="category-item__name">{c.nome}</span>
                          <span className="category-item__slug">/{c.slug}</span>
                        </div>
                      </div>
                      <label
                        className="admin-switch category-item__switch"
                        data-disabled={
                          switchDisabled ? "true" : undefined
                        }
                      >
                        <span className="category-item__switch-label">
                          {c.ativo ? "Ativa" : "Inativa"}
                        </span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={c.ativo}
                          disabled={switchDisabled}
                          aria-label={
                            lockedByParent
                              ? `${c.nome}: bloqueada enquanto a categoria pai estiver inativa`
                              : c.ativo
                                ? `Inativar ${c.nome}`
                                : `Ativar ${c.nome}`
                          }
                          onChange={() => void toggleAtivo(c)}
                        />
                        <span
                          className="admin-switch__track"
                          aria-hidden="true"
                          data-loading={togglingId === c.id ? "true" : undefined}
                        />
                      </label>
                    </div>

                    <div className="category-item__footer">
                      <div className="category-item__meta">
                        {depth > 0 ? (
                          <span className="tag-chip tag-chip--soft">
                            nível {depth + 1}
                          </span>
                        ) : (
                          <span className="tag-chip tag-chip--soft">raiz</span>
                        )}
                        <span className="tag-chip tag-chip--soft">
                          ordem {c.ordem}
                        </span>
                      </div>
                      <LoadingButton
                        type="button"
                        className="btn-quiet btn-quiet--danger btn-icon category-item__delete"
                        onClick={() => remove(c.id)}
                        loading={deletingId === c.id}
                        loadingLabel="Excluindo…"
                        disabled={saving || togglingId === c.id}
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
                        <span className="category-item__delete-label">
                          Excluir
                        </span>
                      </LoadingButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
