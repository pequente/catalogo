"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { navItemKindLabel } from "@/src/lib/navigation-admin";
import { navItemLabel, type NavItem } from "@/src/schemas/navigation";
import styles from "./NavegacaoEditor.module.css";

type Props = {
  item: NavItem;
  index: number;
  total: number;
  disabled?: boolean;
  dragging: boolean;
  expanded?: boolean;
  onToggleVisible: () => void;
  onToggleExpand: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
};

export function NavItemRow({
  item,
  index,
  total,
  disabled,
  dragging,
  expanded,
  onToggleVisible,
  onToggleExpand,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDropOn,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const visible = item.visivel !== false;
  const label = navItemLabel(item);
  const kind = navItemKindLabel(item);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuBtnRef.current?.focus();
      }
    }
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    firstItemRef.current?.focus();
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <li
      className={[
        styles.row,
        !visible ? styles.rowHidden : "",
        dragging ? styles.rowDragging : "",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={!disabled}
      onDragStart={(e) => {
        if (disabled) {
          e.preventDefault();
          return;
        }
        onDragStart();
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropOn();
      }}
    >
      <div className={styles.rowMain}>
        <span className={styles.drag} aria-hidden="true" title="Arrastar">
          <GripVertical size={16} strokeWidth={1.75} />
        </span>
        <div className={styles.rowText}>
          <span className={styles.rowLabel}>{label}</span>
          <div className={styles.rowMeta}>
            <span className={styles.badge}>{kind}</span>
            {!visible ? (
              <span className={`${styles.badge} ${styles.badgeMuted}`}>
                Oculto na loja
              </span>
            ) : null}
          </div>
        </div>
        <div className={styles.rowActions}>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.moveBtn}`}
            disabled={disabled || index === 0}
            aria-label={`Mover ${label} para cima`}
            onClick={onMoveUp}
          >
            <ArrowUp size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={`${styles.iconBtn} ${styles.moveBtn}`}
            disabled={disabled || index >= total - 1}
            aria-label={`Mover ${label} para baixo`}
            onClick={onMoveDown}
          >
            <ArrowDown size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className={[
              styles.iconBtn,
              !visible ? styles.iconBtnActive : "",
            ]
              .filter(Boolean)
              .join(" ")}
            disabled={disabled}
            aria-pressed={visible}
            aria-label={visible ? `Ocultar ${label}` : `Mostrar ${label}`}
            onClick={onToggleVisible}
          >
            {visible ? (
              <Eye size={18} strokeWidth={1.75} aria-hidden />
            ) : (
              <EyeOff size={18} strokeWidth={1.75} aria-hidden />
            )}
          </button>
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              ref={menuBtnRef}
              type="button"
              className={[
                styles.iconBtn,
                expanded || menuOpen ? styles.iconBtnActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              aria-controls={menuOpen ? menuId : undefined}
              aria-label={`Ações para ${label}`}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />
            </button>
            {menuOpen ? (
              <div className={styles.menu} role="menu" id={menuId}>
                <button
                  ref={firstItemRef}
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleExpand();
                  }}
                >
                  <Pencil size={15} strokeWidth={1.75} aria-hidden />
                  Editar
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={index === 0}
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveUp();
                  }}
                >
                  <ArrowUp size={15} strokeWidth={1.75} aria-hidden />
                  Mover para cima
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={styles.menuItem}
                  disabled={index >= total - 1}
                  onClick={() => {
                    setMenuOpen(false);
                    onMoveDown();
                  }}
                >
                  <ArrowDown size={15} strokeWidth={1.75} aria-hidden />
                  Mover para baixo
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={() => {
                    setMenuOpen(false);
                    onRemove();
                  }}
                >
                  <Trash2 size={15} strokeWidth={1.75} aria-hidden />
                  Remover
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
