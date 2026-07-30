"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import {
  buildCategoryTree,
  categoryPathLabel,
  getAncestorIds,
  getFilterCategoryIds,
  type CategoryTreeNode,
} from "@/src/lib/categories-tree";
import {
  countCompactFacetMatches,
  type CompactCatalogFacets,
} from "@/src/lib/front/catalog-facets";
import type { Category } from "@/src/schemas/category";

export type CatalogCategoryOption = {
  id: string;
  slug: string;
  nome: string;
  depth?: number;
  parentId?: string | null;
};

/** @deprecated Use CompactCatalogFacets via `facets` prop. */
export type CatalogFacetProduct = {
  categoriasIds: string[];
  tamanhos: string[];
  cores: string[];
};

type CategoryLite = Pick<Category, "id" | "parentId" | "ativo">;

type Props = {
  categories: CatalogCategoryOption[];
  facets: CompactCatalogFacets;
  allCategories?: CategoryLite[];
  q?: string;
  categoria?: string;
  tamanho?: string;
  cor?: string;
  labelCategoria: string;
  buscaPlaceholder: string;
  dimensoes: Array<{ id: string; rotulo: string }>;
};

function buildFilterHref(values: {
  q?: string;
  categoria?: string;
  tamanho?: string;
  cor?: string;
}): string {
  const params = new URLSearchParams();
  if (values.q?.trim()) params.set("q", values.q.trim());
  if (values.categoria) params.set("categoria", values.categoria);
  if (values.tamanho) params.set("tamanho", values.tamanho);
  if (values.cor) params.set("cor", values.cor);
  // Filters always reset to page 1. Unfiltered → ISR `/catalogo`.
  const qs = params.toString();
  if (!qs) return "/catalogo";
  return `/catalogo/busca?${qs}`;
}

function toCategoryStub(c: CatalogCategoryOption): Category {
  return {
    id: c.id,
    parentId: c.parentId ?? null,
    ativo: true,
    versao: 1,
    nome: c.nome,
    slug: c.slug,
    ordem: 0,
    criadoEm: "",
    atualizadoEm: "",
  };
}

function openIdsForSelection(
  selectedSlug: string,
  categories: CatalogCategoryOption[],
  stubs: Category[],
): Set<string> {
  const open = new Set<string>();
  if (!selectedSlug) return open;
  const selected = categories.find((c) => c.slug === selectedSlug);
  if (!selected) return open;
  for (const id of getAncestorIds(selected.id, stubs)) {
    open.add(id);
  }
  if (stubs.some((c) => c.parentId === selected.id)) {
    open.add(selected.id);
  }
  return open;
}

function CategoryFilterBranch({
  node,
  depth,
  selectedSlug,
  openIds,
  onSelect,
  onToggle,
}: {
  node: CategoryTreeNode;
  depth: number;
  selectedSlug: string;
  openIds: Set<string>;
  onSelect: (slug: string) => void;
  onToggle: (id: string) => void;
}) {
  const panelId = useId();
  const hasKids = node.children.length > 0;
  const open = openIds.has(node.id);
  const active = selectedSlug === node.slug;

  return (
    <div className="catalog-filters__tree-branch">
      <div
        className={`catalog-filters__tree-row${active ? " catalog-filters__tree-row--active" : ""}`}
        data-depth={depth}
      >
        <button
          type="button"
          className="catalog-filters__tree-select"
          role="radio"
          aria-checked={active}
          onClick={() => onSelect(node.slug)}
        >
          <span className="catalog-filters__tree-radio" aria-hidden />
          <span className="catalog-filters__tree-label">{node.nome}</span>
        </button>
        {hasKids ? (
          <button
            type="button"
            className="catalog-filters__tree-chevron"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? `Recolher ${node.nome}` : `Expandir ${node.nome}`}
            onClick={() => onToggle(node.id)}
          >
            <span aria-hidden>{open ? "▾" : "▸"}</span>
          </button>
        ) : null}
      </div>
      {hasKids ? (
        <div
          id={panelId}
          className="catalog-filters__tree-children"
          hidden={!open}
          role="group"
          aria-label={node.nome}
        >
          {node.children.map((child) => (
            <CategoryFilterBranch
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedSlug={selectedSlug}
              openIds={openIds}
              onSelect={onSelect}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CategoryFilterTree({
  categories,
  selectedSlug,
  sheetOpen,
  onSelect,
}: {
  categories: CatalogCategoryOption[];
  selectedSlug: string;
  sheetOpen: boolean;
  onSelect: (slug: string) => void;
}) {
  const stubs = useMemo(
    () => categories.map(toCategoryStub),
    [categories],
  );
  const tree = useMemo(() => buildCategoryTree(stubs), [stubs]);
  const [openIds, setOpenIds] = useState(() =>
    openIdsForSelection(selectedSlug, categories, stubs),
  );

  useEffect(() => {
    if (!sheetOpen) return;
    setOpenIds(openIdsForSelection(selectedSlug, categories, stubs));
  }, [sheetOpen, selectedSlug, categories, stubs]);

  const onToggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (tree.length === 0) return null;

  return (
    <div
      className="catalog-filters__tree"
      role="radiogroup"
      aria-label="Categoria"
    >
      {tree.map((node) => (
        <CategoryFilterBranch
          key={node.id}
          node={node}
          depth={0}
          selectedSlug={selectedSlug}
          openIds={openIds}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}

export function CatalogFilters({
  categories,
  facets,
  allCategories = [],
  q = "",
  categoria = "",
  tamanho = "",
  cor = "",
  labelCategoria,
  buscaPlaceholder,
  dimensoes,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [draftQ, setDraftQ] = useState(q);
  const [draftCategoria, setDraftCategoria] = useState(categoria);
  const [draftTamanho, setDraftTamanho] = useState(tamanho);
  const [draftCor, setDraftCor] = useState(cor);

  const dim0Label = dimensoes[0]?.rotulo ?? "Tamanho";
  const dim1Label = dimensoes[1]?.rotulo ?? "Cor";
  const tamanhos = facets.tamanhos;
  const cores = facets.cores;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setDraftQ(q);
    setDraftCategoria(categoria);
    setDraftTamanho(tamanho);
    setDraftCor(cor);
  }, [q, categoria, tamanho, cor]);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const closeBtn = document.querySelector(
      ".catalog-filters__sheet-close",
    ) as HTMLButtonElement | null;
    closeBtn?.focus();
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [sheetOpen]);

  const navigate = useCallback(
    (values: {
      q?: string;
      categoria?: string;
      tamanho?: string;
      cor?: string;
    }) => {
      router.push(buildFilterHref(values));
    },
    [router],
  );

  const filterBadge = [categoria, tamanho, cor].filter(Boolean).length;

  const categoriesForTree = useMemo((): Category[] => {
    if (allCategories.length > 0) {
      return allCategories.map((c) => ({
        id: c.id,
        parentId: c.parentId ?? null,
        ativo: c.ativo,
        versao: 1,
        nome: "",
        slug: "",
        ordem: 0,
        criadoEm: "",
        atualizadoEm: "",
      }));
    }
    return categories.map(toCategoryStub);
  }, [allCategories, categories]);

  const pathStubs = useMemo(
    () => categories.map(toCategoryStub),
    [categories],
  );

  const draftCount = useMemo(() => {
    const cat = draftCategoria
      ? categories.find((c) => c.slug === draftCategoria)
      : undefined;
    const filterIds = cat
      ? new Set(getFilterCategoryIds(cat.id, categoriesForTree))
      : null;
    return countCompactFacetMatches(facets, {
      categoryIdSet: filterIds,
      tamanho: draftTamanho || undefined,
      cor: draftCor || undefined,
    });
  }, [
    facets,
    categories,
    categoriesForTree,
    draftCategoria,
    draftTamanho,
    draftCor,
  ]);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    if (q) {
      chips.push({
        key: "q",
        label: `Busca: ${q}`,
        clear: () => navigate({ categoria, tamanho, cor }),
      });
    }
    if (categoria) {
      const cat = categories.find((c) => c.slug === categoria);
      const label = cat
        ? categoryPathLabel(toCategoryStub(cat), pathStubs)
        : categoria;
      chips.push({
        key: "categoria",
        label,
        clear: () => navigate({ q, tamanho, cor }),
      });
    }
    if (tamanho) {
      chips.push({
        key: "tamanho",
        label: `Tam. ${tamanho}`,
        clear: () => navigate({ q, categoria, cor }),
      });
    }
    if (cor) {
      chips.push({
        key: "cor",
        label: cor,
        clear: () => navigate({ q, categoria, tamanho }),
      });
    }
    return chips;
  }, [q, categoria, tamanho, cor, categories, pathStubs, navigate]);

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    navigate({
      q: draftQ,
      categoria,
      tamanho,
      cor,
    });
  }

  function applyDraft() {
    navigate({
      q: draftQ,
      categoria: draftCategoria,
      tamanho: draftTamanho,
      cor: draftCor,
    });
    setSheetOpen(false);
  }

  function clearAll() {
    setDraftQ("");
    setDraftCategoria("");
    setDraftTamanho("");
    setDraftCor("");
    navigate({});
    setSheetOpen(false);
  }

  function toggleDraft(
    field: "categoria" | "tamanho" | "cor",
    value: string,
  ) {
    if (field === "categoria") {
      setDraftCategoria((prev) => (prev === value ? "" : value));
    } else if (field === "tamanho") {
      setDraftTamanho((prev) => (prev === value ? "" : value));
    } else {
      setDraftCor((prev) => (prev === value ? "" : value));
    }
  }

  const panelBody = (
    <>
      <div className="catalog-filters__section">
        <h3 className="catalog-filters__section-title">{labelCategoria}</h3>
        <CategoryFilterTree
          categories={categories}
          selectedSlug={draftCategoria}
          sheetOpen={sheetOpen}
          onSelect={(slug) => toggleDraft("categoria", slug)}
        />
      </div>

      {tamanhos.length > 0 ? (
        <div className="catalog-filters__section">
          <h3 className="catalog-filters__section-title">{dim0Label}</h3>
          <div className="catalog-filters__chips catalog-filters__chips--sizes">
            {tamanhos.map((t) => {
              const active = draftTamanho === t;
              return (
                <button
                  key={t}
                  type="button"
                  className={`catalog-filters__chip catalog-filters__chip--size${active ? " catalog-filters__chip--active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleDraft("tamanho", t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {cores.length > 0 ? (
        <div className="catalog-filters__section">
          <h3 className="catalog-filters__section-title">{dim1Label}</h3>
          <div className="catalog-filters__chips">
            {cores.map((c) => {
              const active = draftCor === c;
              return (
                <button
                  key={c}
                  type="button"
                  className={`catalog-filters__chip${active ? " catalog-filters__chip--active" : ""}`}
                  aria-pressed={active}
                  onClick={() => toggleDraft("cor", c)}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );

  const sheet =
    sheetOpen && mounted
      ? createPortal(
          <div className="catalog-filters__sheet-root" role="presentation">
            <button
              type="button"
              className="catalog-filters__sheet-overlay"
              aria-label="Fechar filtros"
              tabIndex={-1}
              onClick={() => setSheetOpen(false)}
            />
            <div
              className="catalog-filters__sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="catalog-filters__sheet-head">
                <h2 id={titleId}>Filtros</h2>
                <button
                  type="button"
                  className="catalog-filters__sheet-close"
                  aria-label="Fechar filtros"
                  onClick={() => setSheetOpen(false)}
                >
                  ✕
                </button>
              </div>
              <div className="catalog-filters__sheet-body">{panelBody}</div>
              <div className="catalog-filters__sheet-foot">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={clearAll}
                >
                  Limpar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyDraft}
                >
                  Ver {draftCount} produto{draftCount === 1 ? "" : "s"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="catalog-filters">
      <div className="catalog-filters__toolbar">
        <form
          className="catalog-filters__search"
          onSubmit={onSearchSubmit}
          role="search"
        >
          <label className="visually-hidden" htmlFor="catalog-q">
            {buscaPlaceholder}
          </label>
          <input
            id="catalog-q"
            className="catalog-filters__search-input"
            type="search"
            name="q"
            placeholder={buscaPlaceholder}
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            enterKeyHint="search"
          />
          <button
            type="submit"
            className="catalog-filters__search-btn"
            aria-label="Buscar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path
                d="M20 20l-3.5-3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </form>

        <button
          type="button"
          className="btn btn-dark catalog-filters__open"
          onClick={() => {
            setDraftCategoria(categoria);
            setDraftTamanho(tamanho);
            setDraftCor(cor);
            setSheetOpen(true);
          }}
        >
          Filtros
          {filterBadge > 0 ? (
            <span className="catalog-filters__badge">{filterBadge}</span>
          ) : null}
        </button>
      </div>

      {activeChips.length > 0 ? (
        <div className="catalog-filters__active" aria-label="Filtros ativos">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="catalog-filters__active-chip"
              onClick={chip.clear}
              aria-label={`Remover filtro ${chip.label}`}
            >
              {chip.label}
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            className="catalog-filters__clear-all"
            onClick={clearAll}
          >
            Limpar tudo
          </button>
        </div>
      ) : null}

      {sheet}
    </div>
  );
}
