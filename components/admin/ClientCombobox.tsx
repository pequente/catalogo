"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { matchesClientQuery } from "@/src/lib/front/client-filter";
import { formatBrWhatsApp } from "@/src/lib/wa";
import type { Client } from "@/src/schemas/client";

function clientLabel(c: Client) {
  const parts = [c.nome];
  if (c.celular) parts.push(formatBrWhatsApp(c.celular));
  else if (c.email) parts.push(c.email);
  return parts.join(" · ");
}

export function ClientCombobox({
  clients,
  value,
  onChange,
  disabled,
}: {
  clients: Client[];
  value: string;
  onChange: (clienteId: string) => void;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = clients.find((c) => c.id === value) ?? null;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    const list = clients.filter((c) => matchesClientQuery(c, query));
    return list.slice(0, 40);
  }, [clients, query]);

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
  }, [query, open]);

  function selectClient(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(false);
  }

  function openPicker() {
    if (disabled) return;
    setOpen(true);
    setQuery("");
  }

  const displayValue = open
    ? query
    : selected
      ? clientLabel(selected)
      : "";

  const options = [
    { id: "", label: "Sem cliente", secondary: "Venda sem lead vinculado" },
    ...filtered.map((c) => ({
      id: c.id,
      label: c.nome,
      secondary: [c.celular ? formatBrWhatsApp(c.celular) : null, c.email]
        .filter(Boolean)
        .join(" · "),
    })),
  ];

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        openPicker();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, options.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = options[activeIndex];
      if (opt) selectClient(opt.id);
    }
  }

  return (
    <div className="client-combobox" ref={rootRef}>
      <div className="client-combobox__control">
        <input
          className="input"
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && options[activeIndex]
              ? `${listId}-${activeIndex}`
              : undefined
          }
          placeholder="Buscar por nome, celular ou e-mail…"
          value={displayValue}
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
        {selected && !disabled ? (
          <button
            type="button"
            className="client-combobox__clear"
            aria-label="Limpar cliente"
            onClick={clear}
          >
            ×
          </button>
        ) : null}
      </div>

      {open ? (
        <ul
          id={listId}
          className="client-combobox__list"
          role="listbox"
          aria-label="Clientes"
        >
          {options.length === 0 ? (
            <li className="client-combobox__empty" role="presentation">
              Nenhum cliente encontrado
            </li>
          ) : (
            options.map((opt, index) => (
              <li
                key={opt.id || "__none"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={
                  opt.id === value || (opt.id === "" && !value)
                }
                className="client-combobox__option"
                data-active={index === activeIndex ? "true" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectClient(opt.id);
                }}
              >
                <strong>{opt.label}</strong>
                {opt.secondary ? <span>{opt.secondary}</span> : null}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
