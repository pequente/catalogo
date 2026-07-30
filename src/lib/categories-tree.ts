import type { Category } from "@/src/schemas/category";

export const CATEGORY_MAX_DEPTH = 3;

export type CategoryTreeNode = Category & { children: CategoryTreeNode[] };

export function getCategoryDepth(
  categoryId: string | null | undefined,
  all: Category[],
): number {
  if (!categoryId) return 0;
  const byId = new Map(all.map((c) => [c.id, c]));
  let depth = 0;
  let current: Category | undefined = byId.get(categoryId);
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) return depth;
    seen.add(current.id);
    depth += 1;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return depth;
}

/** Depth of a new/updated node under `parentId` (null = root → depth 1). */
export function depthUnderParent(
  parentId: string | null | undefined,
  all: Category[],
): number {
  if (!parentId) return 1;
  return getCategoryDepth(parentId, all) + 1;
}

export function getAncestorIds(
  categoryId: string,
  all: Category[],
): string[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const ancestors: string[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current?.parentId) {
    if (seen.has(current.parentId)) break;
    seen.add(current.parentId);
    ancestors.push(current.parentId);
    current = byId.get(current.parentId);
  }
  return ancestors;
}

export function getDescendantIds(
  categoryId: string,
  all: Category[],
): string[] {
  const childrenByParent = new Map<string | null, Category[]>();
  for (const c of all) {
    const key = c.parentId;
    const list = childrenByParent.get(key) ?? [];
    list.push(c);
    childrenByParent.set(key, list);
  }
  const out: string[] = [];
  const stack = [...(childrenByParent.get(categoryId) ?? [])];
  while (stack.length > 0) {
    const node = stack.pop()!;
    out.push(node.id);
    const kids = childrenByParent.get(node.id);
    if (kids) stack.push(...kids);
  }
  return out;
}

export function hasInactiveAncestor(
  category: Category,
  all: Category[],
): boolean {
  const byId = new Map(all.map((c) => [c.id, c]));
  const seen = new Set<string>();
  let parentId = category.parentId;
  while (parentId) {
    if (seen.has(parentId)) return true;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent || !parent.ativo) return true;
    parentId = parent.parentId;
  }
  return false;
}

export function isEffectivelyActive(
  category: Category,
  all: Category[],
): boolean {
  if (!category.ativo) return false;
  return !hasInactiveAncestor(category, all);
}

export function filterEffectivelyActive(all: Category[]): Category[] {
  return all.filter((c) => isEffectivelyActive(c, all));
}

/** Ids of the category and its effectively-active descendants (inclusive). */
export function getFilterCategoryIds(
  categoryId: string,
  all: Category[],
): string[] {
  const active = new Set(
    filterEffectivelyActive(all).map((c) => c.id),
  );
  if (!active.has(categoryId)) return [];
  return [
    categoryId,
    ...getDescendantIds(categoryId, all).filter((id) => active.has(id)),
  ];
}

export function wouldCreateCycle(
  categoryId: string,
  newParentId: string | null,
  all: Category[],
): boolean {
  if (!newParentId) return false;
  if (newParentId === categoryId) return true;
  return getDescendantIds(categoryId, all).includes(newParentId);
}

export function buildCategoryTree(flat: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>();
  for (const c of flat) {
    nodes.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryTreeNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (list: CategoryTreeNode[]) => {
    list.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
    for (const n of list) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}

/** Flatten tree to pre-order list with depth (0-based for indent). */
export function flattenCategoryTree(
  tree: CategoryTreeNode[],
  depth = 0,
): Array<{ category: Category; depth: number }> {
  const out: Array<{ category: Category; depth: number }> = [];
  for (const node of tree) {
    const { children, ...category } = node;
    out.push({ category, depth });
    out.push(...flattenCategoryTree(children, depth + 1));
  }
  return out;
}

export function categoryPathLabel(
  category: Category,
  all: Category[],
): string {
  const byId = new Map(all.map((c) => [c.id, c]));
  const parts: string[] = [category.nome];
  let parentId = category.parentId;
  const seen = new Set<string>();
  while (parentId) {
    if (seen.has(parentId)) break;
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    parts.unshift(parent.nome);
    parentId = parent.parentId;
  }
  return parts.join(" › ");
}

export function hasChildren(categoryId: string, all: Category[]): boolean {
  return all.some((c) => c.parentId === categoryId);
}
