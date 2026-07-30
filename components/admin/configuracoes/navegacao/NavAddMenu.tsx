"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ExternalLink,
  FileText,
  Home,
  Link2,
  Package,
  Plus,
  Tags,
} from "lucide-react";
import {
  createCustomNavItem,
  type NavItem,
} from "@/src/schemas/navigation";
import styles from "./NavegacaoEditor.module.css";

type Props = {
  itens: NavItem[];
  surfaceKey: "header" | "drawer";
  disabled?: boolean;
  onAdd: (item: NavItem) => void;
};

const OPTIONS = [
  {
    chave: "inicio" as const,
    label: "Início",
    desc: "Página principal da loja",
    icon: Home,
  },
  {
    chave: "catalogo" as const,
    label: "Catálogo",
    desc: "Lista de produtos",
    icon: Package,
  },
  {
    chave: "sobre" as const,
    label: "Sobre",
    desc: "Página institucional",
    icon: FileText,
  },
];

export function NavAddMenu({ itens, surfaceKey, disabled, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    }
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function addBuiltin(chave: "inicio" | "catalogo" | "sobre") {
    if (itens.some((i) => i.tipo === "link" && i.chave === chave)) return;
    onAdd({
      id: `${surfaceKey}-link-${chave}-${Date.now()}`,
      tipo: "link",
      chave,
      visivel: true,
    });
    setOpen(false);
  }

  function addCategorias() {
    if (itens.some((i) => i.tipo === "categorias")) return;
    onAdd({
      id: `${surfaceKey}-categorias-${Date.now()}`,
      tipo: "categorias",
      visivel: true,
      categoriaIds: null,
      maxRaizes: surfaceKey === "header" ? 4 : null,
      incluirFilhos: true,
    });
    setOpen(false);
  }

  function addCustom() {
    onAdd(createCustomNavItem());
    setOpen(false);
  }

  const hasCat = itens.some((i) => i.tipo === "categorias");
  const hasInicio = itens.some((i) => i.tipo === "link" && i.chave === "inicio");
  const hasCatalogo = itens.some(
    (i) => i.tipo === "link" && i.chave === "catalogo",
  );
  const hasSobre = itens.some((i) => i.tipo === "link" && i.chave === "sobre");
  const disabledMap = {
    inicio: hasInicio,
    catalogo: hasCatalogo,
    sobre: hasSobre,
  };

  return (
    <div className={styles.addWrap} ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        className={styles.addBtn}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <Plus size={16} strokeWidth={1.75} aria-hidden />
        Adicionar link ao menu
      </button>
      {open ? (
        <div className={styles.addMenu} role="menu" id={menuId}>
          {OPTIONS.map((opt, i) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.chave}
                ref={i === 0 ? firstItemRef : undefined}
                type="button"
                role="menuitem"
                className={styles.addItem}
                disabled={disabledMap[opt.chave]}
                onClick={() => addBuiltin(opt.chave)}
              >
                <Icon size={16} strokeWidth={1.75} aria-hidden />
                <span className={styles.addItemCopy}>
                  <span>{opt.label}</span>
                  <span className={styles.addItemDesc}>{opt.desc}</span>
                </span>
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            className={styles.addItem}
            disabled={hasCat}
            onClick={addCategorias}
          >
            <Tags size={16} strokeWidth={1.75} aria-hidden />
            <span className={styles.addItemCopy}>
              <span>Categorias</span>
              <span className={styles.addItemDesc}>
                Menu com as categorias da loja
              </span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.addItem}
            onClick={addCustom}
          >
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden />
            <span className={styles.addItemCopy}>
              <span>Link personalizado</span>
              <span className={styles.addItemDesc}>
                Qualquer página ou site externo
              </span>
            </span>
            <Link2 size={14} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      ) : null}
    </div>
  );
}
