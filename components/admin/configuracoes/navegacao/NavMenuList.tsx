"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import type { NavSurfaceKey } from "@/src/lib/navigation-admin";
import type { NavItem } from "@/src/schemas/navigation";
import type { Category } from "@/src/schemas/category";
import { NavAddMenu } from "./NavAddMenu";
import { NavItemEditor } from "./NavItemEditor";
import { NavItemRow } from "./NavItemRow";
import styles from "./NavegacaoEditor.module.css";

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  if (!item) return list;
  next.splice(to, 0, item);
  return next;
}

type Props = {
  surfaceKey: NavSurfaceKey;
  itens: NavItem[];
  categories: Category[];
  disabled?: boolean;
  onChange: (itens: NavItem[]) => void;
};

export function NavMenuList({
  surfaceKey,
  itens,
  categories,
  disabled,
  onChange,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  function updateItem(id: string, next: NavItem) {
    onChange(itens.map((item) => (item.id === id ? next : item)));
  }

  function reorder(from: number, to: number) {
    onChange(moveItem(itens, from, to));
  }

  const expandedItem = itens.find((i) => i.id === expandedId);

  return (
    <div className={styles.listBlock}>
      <p className={styles.listHint}>
        <Info size={15} strokeWidth={1.75} className={styles.listHintIcon} aria-hidden />
        <span>
          Arraste pelo ícone de pontos para reordenar, ou use as setas. Itens
          ocultos (olho riscado) não aparecem na loja.
        </span>
      </p>
      <ul className={styles.list}>
        {itens.map((item, index) => (
          <NavItemRow
            key={item.id}
            item={item}
            index={index}
            total={itens.length}
            disabled={disabled}
            dragging={dragIndex === index}
            expanded={expandedId === item.id}
            onToggleVisible={() =>
              updateItem(item.id, {
                ...item,
                visivel: item.visivel === false,
              })
            }
            onToggleExpand={() =>
              setExpandedId(expandedId === item.id ? null : item.id)
            }
            onRemove={() => {
              if (expandedId === item.id) setExpandedId(null);
              onChange(itens.filter((i) => i.id !== item.id));
            }}
            onMoveUp={() => reorder(index, index - 1)}
            onMoveDown={() => reorder(index, index + 1)}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDropOn={() => {
              if (dragIndex != null && dragIndex !== index) {
                reorder(dragIndex, index);
              }
              setDragIndex(null);
            }}
          />
        ))}
      </ul>
      {itens.length === 0 ? (
        <p className={styles.listEmpty}>
          Nenhum link neste menu ainda. Adicione páginas, categorias ou um link
          personalizado.
        </p>
      ) : null}
      {expandedItem ? (
        <NavItemEditor
          item={expandedItem}
          surfaceKey={surfaceKey}
          categories={categories}
          disabled={disabled}
          onChange={(next) => updateItem(expandedItem.id, next)}
          onClose={() => setExpandedId(null)}
        />
      ) : null}
      <NavAddMenu
        itens={itens}
        surfaceKey={surfaceKey}
        disabled={disabled}
        onAdd={(item) => {
          onChange([...itens, item]);
          setExpandedId(item.id);
        }}
      />
    </div>
  );
}
