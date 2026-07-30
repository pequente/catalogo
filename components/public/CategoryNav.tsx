"use client";

import Link from "next/link";
import {
  useCallback,
  useId,
  useState,
  type CSSProperties,
} from "react";
import type { CategoryTreeNode } from "@/src/lib/categories-tree";
import type { ResolvedNavEntry } from "@/src/lib/navigation";
import styles from "./CategoryNav.module.css";

function catalogHref(slug: string) {
  return `/catalogo?categoria=${slug}`;
}

function NavAnchor({
  href,
  label,
  externo,
  className,
  style,
  title,
}: {
  href: string;
  label: string;
  externo?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const tip = title ?? label;
  if (externo) {
    return (
      <a
        href={href}
        className={className}
        style={style}
        title={tip}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style} title={tip}>
      {label}
    </Link>
  );
}

/** Desktop inline nav from resolved config entries. */
export function ConfiguredDesktopNav({
  entries,
}: {
  entries: ResolvedNavEntry[];
}) {
  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === "link") {
          return (
            <NavAnchor
              key={entry.id}
              href={entry.href}
              label={entry.label}
              externo={entry.externo}
            />
          );
        }
        return (
          <DesktopCategoryRoots
            key={entry.id}
            tree={entry.tree}
            incluirFilhos={entry.incluirFilhos}
          />
        );
      })}
    </>
  );
}

function DesktopCategoryRoots({
  tree,
  incluirFilhos,
}: {
  tree: CategoryTreeNode[];
  incluirFilhos: boolean;
}) {
  return (
    <>
      {tree.map((node) =>
        incluirFilhos && node.children.length > 0 ? (
          <div key={node.id} className={styles.dropdown}>
            <Link
              href={catalogHref(node.slug)}
              className={styles.dropdownTrigger}
              title={node.nome}
            >
              {node.nome}
              <span className={styles.chevron} aria-hidden>
                ▾
              </span>
            </Link>
            <div className={styles.submenu} role="menu">
              <DesktopSubmenu nodes={node.children} />
            </div>
          </div>
        ) : (
          <Link key={node.id} href={catalogHref(node.slug)} title={node.nome}>
            {node.nome}
          </Link>
        ),
      )}
    </>
  );
}

function DesktopSubmenu({ nodes }: { nodes: CategoryTreeNode[] }) {
  return (
    <ul className={styles.submenuList}>
      {nodes.map((node) => (
        <li key={node.id} className={styles.submenuItem}>
          <Link href={catalogHref(node.slug)} role="menuitem">
            {node.nome}
          </Link>
          {node.children.length > 0 ? (
            <DesktopSubmenu nodes={node.children} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Drawer accordion nav from resolved config entries. */
export function ConfiguredDrawerNav({
  entries,
}: {
  entries: ResolvedNavEntry[];
}) {
  return (
    <>
      {entries.map((entry) => {
        if (entry.kind === "link") {
          return (
            <NavAnchor
              key={entry.id}
              href={entry.href}
              label={entry.label}
              externo={entry.externo}
              className={styles.drawerLink}
            />
          );
        }
        return (
          <div
            key={entry.id}
            className={styles.drawerTree}
            data-role="category-tree"
          >
            {entry.tree.map((node) => (
              <DrawerBranch
                key={node.id}
                node={node}
                depth={0}
                incluirFilhos={entry.incluirFilhos}
              />
            ))}
          </div>
        );
      })}
    </>
  );
}

function DrawerBranch({
  node,
  depth,
  incluirFilhos,
}: {
  node: CategoryTreeNode;
  depth: number;
  incluirFilhos: boolean;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const hasKids = incluirFilhos && node.children.length > 0;

  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  if (!hasKids) {
    return (
      <Link
        href={catalogHref(node.slug)}
        className={styles.drawerLink}
        style={{ paddingLeft: `${0.95 + depth * 0.85}rem` }}
      >
        {node.nome}
      </Link>
    );
  }

  return (
    <div className={styles.drawerBranch} data-open={open ? "true" : undefined}>
      <button
        type="button"
        className={styles.drawerToggle}
        style={{ paddingLeft: `${0.95 + depth * 0.85}rem` }}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        <span>{node.nome}</span>
        <span className={styles.drawerChevron} aria-hidden>
          {open ? "▾" : "▸"}
        </span>
      </button>
      <div
        id={panelId}
        className={styles.drawerChildren}
        hidden={!open}
        role="group"
        aria-label={node.nome}
      >
        {node.children.map((child) => (
          <DrawerBranch
            key={child.id}
            node={child}
            depth={depth + 1}
            incluirFilhos={incluirFilhos}
          />
        ))}
      </div>
    </div>
  );
}
