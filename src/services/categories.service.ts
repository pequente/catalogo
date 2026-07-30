import "server-only";
import { cache } from "react";
import {
  listJsonDir,
  readJson,
  writeJson,
  deleteJson,
} from "@/src/lib/data";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import {
  CATEGORY_MAX_DEPTH,
  depthUnderParent,
  filterEffectivelyActive,
  getCategoryDepth,
  getDescendantIds,
  hasChildren,
  wouldCreateCycle,
} from "@/src/lib/categories-tree";
import { slugify } from "@/src/lib/slug";
import {
  categorySchema,
  type Category,
  type categoryCreateSchema,
  type categoryUpdateSchema,
} from "@/src/schemas/category";
import { getProductIndexState } from "@/src/lib/indices/product-index-io";
import { categoryHasProducts } from "@/src/lib/indices/product-index-core";
import type { z } from "zod";

const DIR = "categorias";

function pathFor(id: string) {
  return `${DIR}/${id}.json`;
}

async function categoryInUse(categoriaId: string): Promise<boolean> {
  const state = await getProductIndexState();
  return categoryHasProducts(state, categoriaId);
}

function assertValidParent(
  parentId: string | null,
  all: Category[],
  opts?: { movingId?: string },
) {
  if (!parentId) {
    if (opts?.movingId) {
      assertSubtreeWithinMaxDepth(opts.movingId, null, all);
    }
    return;
  }
  const parent = all.find((c) => c.id === parentId);
  if (!parent) {
    throw new AppError("VALIDATION_ERROR", "Categoria pai inválida", 400);
  }
  if (opts?.movingId && wouldCreateCycle(opts.movingId, parentId, all)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Não é possível mover a categoria para um descendente",
      400,
    );
  }
  const depth = depthUnderParent(parentId, all);
  if (depth > CATEGORY_MAX_DEPTH) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Categorias podem ter no máximo ${CATEGORY_MAX_DEPTH} níveis`,
      400,
    );
  }
  if (opts?.movingId) {
    assertSubtreeWithinMaxDepth(opts.movingId, parentId, all);
  }
}

function assertSubtreeWithinMaxDepth(
  movingId: string,
  newParentId: string | null,
  all: Category[],
) {
  const simulated = all.map((c) =>
    c.id === movingId ? { ...c, parentId: newParentId } : c,
  );
  const ids = [movingId, ...getDescendantIds(movingId, simulated)];
  for (const id of ids) {
    if (getCategoryDepth(id, simulated) > CATEGORY_MAX_DEPTH) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Categorias podem ter no máximo ${CATEGORY_MAX_DEPTH} níveis`,
        400,
      );
    }
  }
}

const loadAllCategories = cache(async (): Promise<Category[]> => {
  const files = await listJsonDir(DIR);
  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`${DIR}/${file}`);
      const parsed = categorySchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[categories] invalid file ${file}`, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    }),
  );
  return results
    .filter((c): c is Category => c !== null)
    .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
});

export async function listCategories(opts?: {
  onlyActive?: boolean;
}): Promise<Category[]> {
  const items = await loadAllCategories();
  if (opts?.onlyActive) return filterEffectivelyActive(items);
  return items;
}

export async function getCategory(id: string): Promise<Category | null> {
  const raw = await readJson<unknown>(pathFor(id));
  if (!raw) return null;
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

export async function createCategory(
  input: z.infer<typeof categoryCreateSchema>,
): Promise<Category> {
  const id = crypto.randomUUID();
  const slug = input.slug ?? slugify(input.nome);
  const all = await listCategories();
  if (all.some((c) => c.slug === slug)) {
    throw new AppError("CONFLICT_SLUG", "Slug de categoria já existe", 409);
  }
  const parentId = input.parentId ?? null;
  assertValidParent(parentId, all);
  const now = new Date().toISOString();
  const siblings = all.filter((c) => c.parentId === parentId);
  const category: Category = {
    id,
    versao: 1,
    nome: input.nome,
    slug,
    ordem: input.ordem ?? (siblings.length + 1) * 10,
    ativo: input.ativo ?? true,
    parentId,
    criadoEm: now,
    atualizadoEm: now,
  };
  categorySchema.parse(category);
  await writeJson(pathFor(id), category, {
    message: `feat(data): create category ${slug}`,
  });
  revalidateStorefront(CACHE_TAGS.categories, CACHE_TAGS.dashboard);
  return category;
}

export async function updateCategory(
  id: string,
  input: z.infer<typeof categoryUpdateSchema>,
): Promise<Category> {
  const current = await getCategory(id);
  if (!current) throw new AppError("NOT_FOUND", "Categoria não encontrada", 404);
  if (current.versao !== input.versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }
  const slug = input.slug ?? current.slug;
  const all = await listCategories();
  if (all.some((c) => c.slug === slug && c.id !== id)) {
    throw new AppError("CONFLICT_SLUG", "Slug de categoria já existe", 409);
  }
  const parentId =
    input.parentId !== undefined ? input.parentId : current.parentId;
  assertValidParent(parentId, all, { movingId: id });
  const updated: Category = {
    ...current,
    ...input,
    id,
    slug,
    parentId,
    versao: current.versao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  categorySchema.parse(updated);
  await writeJson(pathFor(id), updated, {
    message: `chore(data): update category ${slug}`,
  });
  revalidateStorefront(CACHE_TAGS.categories, CACHE_TAGS.products, CACHE_TAGS.dashboard);
  return updated;
}

export async function deleteCategory(id: string): Promise<void> {
  const current = await getCategory(id);
  if (!current) throw new AppError("NOT_FOUND", "Categoria não encontrada", 404);
  const all = await listCategories();
  if (hasChildren(id, all)) {
    throw new AppError(
      "CATEGORY_HAS_CHILDREN",
      "Categoria possui subcategorias. Remova ou mova os filhos antes de excluir.",
      409,
    );
  }
  if (await categoryInUse(id)) {
    throw new AppError(
      "CATEGORY_IN_USE",
      "Categoria possui produtos vinculados",
      409,
    );
  }
  await deleteJson(pathFor(id), {
    message: `chore(data): delete category ${current.slug}`,
  });
  revalidateStorefront(CACHE_TAGS.categories, CACHE_TAGS.dashboard);
}
