"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Product } from "@/src/schemas/product";
import type { ProductListItem } from "@/src/schemas/product-list";

type SearchHit = Pick<ProductListItem, "id" | "nome" | "referencia" | "status">;

/**
 * Typeahead hits use lean list DTOs (index only) — never `full=1`.
 * Full Product (variantes / estoque) is fetched once on pick.
 */
async function searchProducts(q: string): Promise<SearchHit[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "20",
  });
  if (q.trim()) params.set("q", q.trim());
  const res = await fetch(`/api/v1/admin/products?${params}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: ProductListItem[] };
  return (data.items ?? []).map((p) => ({
    id: p.id,
    nome: p.nome,
    referencia: p.referencia,
    status: p.status,
  }));
}

async function fetchProduct(id: string): Promise<Product | null> {
  const res = await fetch(`/api/v1/admin/products/${id}`);
  if (!res.ok) return null;
  return (await res.json()) as Product;
}

function productLabel(p: { nome: string; referencia?: string }) {
  const ref = p.referencia?.trim();
  return ref ? `${p.nome} (Ref. ${ref})` : p.nome;
}

/**
 * Async product picker for order lines — never embeds the full catalog.
 */
export function ProductOrderSearch({
  value,
  selectedProduct,
  onSelect,
  disabled,
}: {
  value: string;
  /** Hydrated product for the current selection (variants / stock). */
  selectedProduct: Product | null;
  onSelect: (product: Product | null) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      void searchProducts(query).then((items) => {
        if (cancelled) return;
        setHits(items);
        setLoading(false);
        setActiveIndex(0);
      });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [open, query]);

  async function pick(id: string) {
    if (!id) {
      onSelect(null);
      setOpen(false);
      setQuery("");
      return;
    }
    if (selectedProduct?.id === id) {
      setOpen(false);
      setQuery("");
      return;
    }
    setLoading(true);
    const product = await fetchProduct(id);
    setLoading(false);
    if (product) onSelect(product);
    setOpen(false);
    setQuery("");
  }

  const displayValue = open
    ? query
    : selectedProduct
      ? productLabel(selectedProduct)
      : "";

  return (
    <div className="product-order-search" ref={rootRef}>
      <input
        className="select input--sm"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder="Buscar produto…"
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            const hit = hits[activeIndex];
            if (hit) void pick(hit.id);
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {value && !disabled ? (
        <button
          type="button"
          className="btn-quiet btn-sm product-order-search__clear"
          onClick={() => void pick("")}
        >
          Limpar
        </button>
      ) : null}
      {open ? (
        <ul id={listId} className="product-order-search__list" role="listbox">
          {loading && hits.length === 0 ? (
            <li className="product-order-search__empty">Buscando…</li>
          ) : hits.length === 0 ? (
            <li className="product-order-search__empty">Nenhum produto</li>
          ) : (
            hits.map((hit, index) => (
              <li key={hit.id} role="option" aria-selected={index === activeIndex}>
                <button
                  type="button"
                  className={
                    index === activeIndex
                      ? "product-order-search__option is-active"
                      : "product-order-search__option"
                  }
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void pick(hit.id)}
                >
                  <span>{productLabel(hit)}</span>
                  <span className="product-cell__sub">{hit.status}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
