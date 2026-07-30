import {
  buildCategoryTree,
  type CategoryTreeNode,
} from "@/src/lib/categories-tree";
import {
  DEFAULT_NAVEGACAO,
  NAV_BUILTIN_HREFS,
  NAV_BUILTIN_LABELS,
  type NavCategoriasItem,
  type NavItem,
  type SiteNavegacao,
} from "@/src/schemas/navigation";
import type { Category } from "@/src/schemas/category";
import type { SiteConfig } from "@/src/schemas/site-config";

export type NavSurfaceKey = "header" | "drawer";

export type ResolvedNavLink = {
  kind: "link";
  id: string;
  href: string;
  label: string;
  externo: boolean;
};

export type ResolvedNavCategories = {
  kind: "categorias";
  id: string;
  tree: CategoryTreeNode[];
  incluirFilhos: boolean;
};

export type ResolvedNavEntry = ResolvedNavLink | ResolvedNavCategories;

/** Ensure parsed/legacy configs always expose a full navegacao object. */
export function getSiteNavegacao(site: SiteConfig): SiteNavegacao {
  return site.navegacao ?? DEFAULT_NAVEGACAO;
}

export function visibleNavItems(itens: NavItem[]): NavItem[] {
  return itens.filter((item) => item.visivel !== false);
}

/**
 * Build an ordered root tree for a `categorias` nav item.
 * Children keep catalog `ordem` under each selected root.
 */
export function resolveCategoryNavTree(
  item: NavCategoriasItem,
  categories: Category[],
): CategoryTreeNode[] {
  const fullTree = buildCategoryTree(categories);
  const byId = new Map(fullTree.map((n) => [n.id, n]));

  let roots: CategoryTreeNode[];
  if (item.categoriaIds == null) {
    roots = fullTree;
  } else {
    roots = [];
    const seen = new Set<string>();
    for (const id of item.categoriaIds) {
      if (seen.has(id)) continue;
      seen.add(id);
      const node = byId.get(id);
      if (node) roots.push(node);
    }
  }

  if (item.maxRaizes != null) {
    roots = roots.slice(0, item.maxRaizes);
  }

  if (!item.incluirFilhos) {
    return roots.map((n) => ({ ...n, children: [] }));
  }

  return roots;
}

export function resolveNavEntries(
  itens: NavItem[],
  categories: Category[],
): ResolvedNavEntry[] {
  const out: ResolvedNavEntry[] = [];

  for (const item of visibleNavItems(itens)) {
    if (item.tipo === "link") {
      out.push({
        kind: "link",
        id: item.id,
        href: NAV_BUILTIN_HREFS[item.chave],
        label: item.rotulo?.trim() || NAV_BUILTIN_LABELS[item.chave],
        externo: false,
      });
      continue;
    }

    if (item.tipo === "custom") {
      out.push({
        kind: "link",
        id: item.id,
        href: item.href,
        label: item.rotulo,
        externo: item.externo,
      });
      continue;
    }

    out.push({
      kind: "categorias",
      id: item.id,
      tree: resolveCategoryNavTree(item, categories),
      incluirFilhos: item.incluirFilhos,
    });
  }

  return out;
}

export function resolveSurfaceEntries(
  site: SiteConfig,
  surface: NavSurfaceKey,
  categories: Category[],
): ResolvedNavEntry[] {
  const nav = getSiteNavegacao(site);
  return resolveNavEntries(nav[surface].itens, categories);
}

/** Root categories available for admin ordering pickers. */
export function listRootCategories(categories: Category[]): Category[] {
  return buildCategoryTree(categories).map((node) => {
    const { children, ...category } = node;
    void children;
    return category;
  });
}
