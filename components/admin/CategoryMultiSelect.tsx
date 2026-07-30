"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  buildCategoryTree,
  categoryPathLabel,
  flattenCategoryTree,
  isEffectivelyActive,
} from "@/src/lib/categories-tree";
import type { Category } from "@/src/schemas/category";

type Props = {
  categories: Category[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
};

export function CategoryMultiSelect({
  categories,
  value,
  onChange,
  disabled,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const flat = useMemo(
    () => flattenCategoryTree(buildCategoryTree(categories)),
    [categories],
  );

  const selected = useMemo(
    () =>
      value
        .map((id) => categories.find((c) => c.id === id))
        .filter((c): c is Category => c != null),
    [categories, value],
  );

  const available = useMemo(() => {
    const selectedSet = new Set(value);
    const q = query.trim().toLowerCase();
    return flat.filter(({ category: c }) => {
      if (selectedSet.has(c.id)) return false;
      if (!isEffectivelyActive(c, categories)) return false;
      if (!q) return true;
      const path = categoryPathLabel(c, categories).toLowerCase();
      return (
        c.nome.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        path.includes(q)
      );
    });
  }, [flat, value, query, categories]);

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
    setActiveIndex(0);
  }, [query, open, available.length]);

  function openPicker() {
    if (disabled) return;
    setOpen(true);
  }

  function add(id: string) {
    if (value.includes(id)) return;
    onChange([...value, id]);
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id));
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      e.preventDefault();
      openPicker();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      e.preventDefault();
      remove(value[value.length - 1]!);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(available.length - 1, 0)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = available[activeIndex];
      if (opt) add(opt.category.id);
    }
  }

  return (
    <div className="category-multi-select" ref={rootRef}>
      <div
        className="admin-chip-input category-multi-select__control"
        onMouseDown={(e) => {
          if (disabled) return;
          if (e.target === inputRef.current) return;
          e.preventDefault();
          openPicker();
          inputRef.current?.focus();
        }}
      >
        {selected.map((c) => (
          <span key={c.id} className="admin-chip">
            {categoryPathLabel(c, categories)}
            <button
              type="button"
              className="admin-chip__remove"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                remove(c.id);
              }}
              aria-label={`Remover ${c.nome}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="admin-chip-input__field"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && available[activeIndex]
              ? `${listId}-${activeIndex}`
              : undefined
          }
          placeholder={
            selected.length === 0
              ? "Buscar e selecionar categorias…"
              : "Adicionar…"
          }
          value={query}
          disabled={disabled}
          autoComplete="off"
          onFocus={openPicker}
          onClick={openPicker}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open ? (
        <ul
          id={listId}
          className="client-combobox__list"
          role="listbox"
          aria-label="Categorias disponíveis"
          aria-multiselectable="true"
        >
          {available.length === 0 ? (
            <li className="client-combobox__empty" role="presentation">
              {categories.length === 0
                ? "Nenhuma categoria cadastrada"
                : query.trim()
                  ? "Nenhuma categoria encontrada"
                  : "Todas as categorias já foram selecionadas"}
            </li>
          ) : (
            available.map(({ category: c, depth }, index) => (
              <li
                key={c.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={false}
                className="client-combobox__option category-multi-select__option"
                data-depth={depth}
                data-active={index === activeIndex ? "true" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(c.id);
                }}
              >
                <strong>{c.nome}</strong>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
