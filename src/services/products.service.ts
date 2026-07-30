import "server-only";
import { cache } from "react";
import { commitFiles, listJsonDir, readBinary, readJson } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import { slugify } from "@/src/lib/slug";
import { normalizeProductReferencia } from "@/src/lib/product-referencia";
import {
  productSchema,
  type Product,
  type ProductCreate,
  type ProductUpdate,
} from "@/src/schemas/product";
import {
  type ProductListItem,
} from "@/src/schemas/product-list";
import type { ProductIndexEntry } from "@/src/schemas/product-index";
import {
  normalizePagination,
  paginateItems,
  type PaginatedResult,
  PAGINATION,
} from "@/src/lib/pagination";
import {
  prepareImageBinary,
  type PendingBinary,
} from "@/src/services/upload.service";
import { isEffectivelyActive } from "@/src/lib/categories-tree";
import { listCategories } from "./categories.service";
import {
  filterProductIndexEntries,
  findReferenciaConflict,
  findSlugConflict,
  indexEntryToListItem,
} from "@/src/lib/indices/product-index-core";
import {
  getProductIndexState,
  resolveProductIdBySlug,
} from "@/src/lib/indices/product-index-io";
import {
  indexWritesAfterRemove,
  indexWritesAfterUpsert,
  loadProductIndexForMutation,
} from "@/src/lib/indices/product-index-mutate";

export type ListProductsFilters = {
  q?: string;
  status?: Product["status"];
  categoria?: string;
  categoriaIds?: string[];
  tamanho?: string;
  cor?: string;
  destaque?: boolean;
  lancamento?: boolean;
  /** When true, only ativo + esgotado (storefront). */
  publicOnly?: boolean;
  page?: number;
  pageSize?: number;
};

const DIR = "produtos";

function pathFor(id: string) {
  return `${DIR}/${id}.json`;
}

type ImageInput = NonNullable<ProductCreate["imagens"]>[number];

async function resolveProductImages(
  imagens: ImageInput[],
  pendingBinaries: Map<string, PendingBinary>,
): Promise<{
  imagens: Product["imagens"];
  binaryWrites: { path: string; bytes: Buffer }[];
}> {
  const binaryWrites: { path: string; bytes: Buffer }[] = [];
  const resolved: Product["imagens"] = [];

  for (const img of imagens) {
    const pending = pendingBinaries.get(img.id);
    if (pending || img.pending) {
      if (!pending) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Arquivo pendente não enviado para imagem ${img.id}`,
          400,
        );
      }
      const prepared = prepareImageBinary(pending, "produtos", img.id);
      binaryWrites.push({ path: prepared.path, bytes: prepared.bytes });
      resolved.push({
        id: prepared.id,
        path: prepared.path,
        alt: img.alt,
        ordem: img.ordem,
      });
      continue;
    }

    const bytes = await readBinary(img.path);
    if (!bytes) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Imagem não encontrada (${img.path}). Selecione o arquivo novamente.`,
        400,
      );
    }
    resolved.push({
      id: img.id,
      path: img.path,
      alt: img.alt,
      ordem: img.ordem,
    });
  }

  return { imagens: resolved, binaryWrites };
}

/**
 * Full catalog scan — reserved for migrations, diagnostics, and repair.
 * Listings and slug lookups must use the product index (Fase 2).
 * @deprecated Prefer listProductsPage / getProductIndexState / getProductBySlug.
 */
export const listAllProducts = cache(async (): Promise<Product[]> => {
  const files = await listJsonDir(DIR);
  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`${DIR}/${file}`);
      const parsed = productSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[products] invalid file ${file}`, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    }),
  );
  return results
    .filter((p): p is Product => p !== null)
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
    );
});

/** Ensure an index exists in memory (rebuild from disk if files missing). */
async function loadIndexEntries(): Promise<ProductIndexEntry[]> {
  const state = await getProductIndexState();
  return state.entries;
}

function defaultPageSize(filters?: ListProductsFilters): number {
  return filters?.publicOnly
    ? PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE
    : PAGINATION.ADMIN_DEFAULT_PAGE_SIZE;
}

/**
 * Paginated product list as lean DTOs — O(index) I/O, not O(N) entity reads.
 */
export async function listProductsPage(
  filters?: ListProductsFilters,
): Promise<PaginatedResult<ProductListItem>> {
  const entries = await loadIndexEntries();
  const filtered = filterProductIndexEntries(entries, filters);
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: defaultPageSize(filters) },
  );
  const page = paginateItems(filtered, pagination);
  return {
    ...page,
    items: page.items.map((e) => indexEntryToListItem(e)),
  };
}

/**
 * Full Product entities for a page (admin picker).
 * Resolves only the K ids on the page via getProductById — O(index + K).
 */
export async function listProductsPageFull(
  filters?: ListProductsFilters,
): Promise<PaginatedResult<Product>> {
  const entries = await loadIndexEntries();
  const filtered = filterProductIndexEntries(entries, filters);
  const pagination = normalizePagination(
    { page: filters?.page, pageSize: filters?.pageSize },
    { defaultPageSize: defaultPageSize(filters) },
  );
  const page = paginateItems(filtered, pagination);
  const products = await getProductsByIds(page.items.map((e) => e.id));
  const byId = new Map(products.map((p) => [p.id, p]));
  return {
    ...page,
    items: page.items
      .map((e) => byId.get(e.id))
      .filter((p): p is Product => p !== undefined),
  };
}

export async function listPublicProducts(
  filters?: Omit<ListProductsFilters, "publicOnly" | "status">,
): Promise<PaginatedResult<Product>> {
  return listProductsPageFull({ ...filters, publicOnly: true });
}

export async function getProductById(id: string): Promise<Product | null> {
  const raw = await readJson<unknown>(pathFor(id));
  if (!raw) return null;
  const parsed = productSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Load specific products by id (cart / pedido seed). Missing ids are omitted. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const results = await Promise.all(unique.map((id) => getProductById(id)));
  return results.filter((p): p is Product => p !== null);
}

export async function getProductBySlug(
  slug: string,
  opts?: { includeHidden?: boolean },
): Promise<Product | null> {
  const id = await resolveProductIdBySlug(slug);
  if (!id) return null;
  const product = await getProductById(id);
  if (!product) return null;
  if (!opts?.includeHidden && product.status === "oculto") return null;
  return product;
}

async function assertUniqueSlug(slug: string, excludeId?: string) {
  const state = await getProductIndexState();
  if (findSlugConflict(state, slug, excludeId)) {
    throw new AppError("CONFLICT_SLUG", "Slug de produto já existe", 409);
  }
}

async function assertUniqueReferencia(referencia: string, excludeId?: string) {
  if (!referencia) return;
  const state = await getProductIndexState();
  const conflict = findReferenciaConflict(state, referencia, excludeId);
  if (conflict) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Referência já usada no produto "${conflict.nome}"`,
      409,
    );
  }
}

async function assertCategoriesAssignable(categoriasIds: string[]) {
  const all = await listCategories();
  const byId = new Map(all.map((c) => [c.id, c]));
  for (const id of categoriasIds) {
    const cat = byId.get(id);
    if (!cat) {
      throw new AppError("VALIDATION_ERROR", "categoriasIds inválido", 400);
    }
    if (!isEffectivelyActive(cat, all)) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Categoria "${cat.nome}" está inativa e não pode receber produtos`,
        400,
      );
    }
  }
}

export async function createProduct(
  input: ProductCreate,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<Product> {
  await assertCategoriesAssignable(input.categoriasIds);
  const id = crypto.randomUUID();
  const slug = input.slug ?? slugify(input.nome);
  await assertUniqueSlug(slug);
  const referencia = normalizeProductReferencia(input.referencia);
  await assertUniqueReferencia(referencia);
  const now = new Date().toISOString();

  const { imagens, binaryWrites } = await resolveProductImages(
    input.imagens ?? [],
    pendingBinaries,
  );

  const product: Product = {
    id,
    versao: 1,
    nome: input.nome,
    slug,
    descricao: input.descricao ?? "",
    referencia,
    preco: input.preco,
    precoPromocional: input.precoPromocional ?? null,
    categoriasIds: input.categoriasIds,
    status: input.status ?? "ativo",
    destaque: input.destaque ?? false,
    lancamento: input.lancamento ?? false,
    imagens,
    variantes: input.variantes ?? [],
    criadoEm: now,
    atualizadoEm: now,
  };
  if (
    product.precoPromocional != null &&
    product.precoPromocional >= product.preco
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "precoPromocional deve ser menor que preco",
      400,
    );
  }
  productSchema.parse(product);

  const indexState = await loadProductIndexForMutation();
  const { writes: indexWrites } = indexWritesAfterUpsert(indexState, product);

  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites: [
        { path: pathFor(id), data: product },
        ...indexWrites,
      ],
    }),
    `feat(data): create product ${slug}`,
  );

  revalidateStorefront(
    CACHE_TAGS.products,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.siteConfig,
    CACHE_TAGS.media,
    { productSlugs: [slug] },
  );
  return product;
}

export async function updateProduct(
  id: string,
  input: ProductUpdate,
  pendingBinaries: Map<string, PendingBinary> = new Map(),
): Promise<Product> {
  const current = await getProductById(id);
  if (!current) throw new AppError("NOT_FOUND", "Produto não encontrado", 404);
  if (current.versao !== input.versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }
  if (input.categoriasIds) {
    const all = await listCategories();
    const byId = new Map(all.map((c) => [c.id, c]));
    const alreadyLinked = new Set(current.categoriasIds);
    for (const catId of input.categoriasIds) {
      const cat = byId.get(catId);
      if (!cat) {
        throw new AppError("VALIDATION_ERROR", "categoriasIds inválido", 400);
      }
      if (!isEffectivelyActive(cat, all) && !alreadyLinked.has(catId)) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Categoria "${cat.nome}" está inativa e não pode receber produtos`,
          400,
        );
      }
    }
  }
  const slug = input.slug ?? current.slug;
  await assertUniqueSlug(slug, id);
  const referenciaNorm =
    input.referencia !== undefined
      ? normalizeProductReferencia(input.referencia)
      : undefined;
  if (referenciaNorm !== undefined) {
    await assertUniqueReferencia(referenciaNorm, id);
  }
  const { versao: _ignoredVersao, imagens: inputImagens, ...rest } = input;
  void _ignoredVersao;

  let imagens = current.imagens;
  let binaryWrites: { path: string; bytes: Buffer }[] = [];
  if (inputImagens) {
    const resolved = await resolveProductImages(inputImagens, pendingBinaries);
    imagens = resolved.imagens;
    binaryWrites = resolved.binaryWrites;
  }

  const updated: Product = {
    ...current,
    ...rest,
    id,
    slug,
    imagens,
    ...(referenciaNorm !== undefined ? { referencia: referenciaNorm } : {}),
    versao: current.versao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  if (
    updated.precoPromocional != null &&
    updated.precoPromocional >= updated.preco
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "precoPromocional deve ser menor que preco",
      400,
    );
  }
  productSchema.parse(updated);

  const removedImages = current.imagens.filter(
    (img) =>
      !updated.imagens.some((u) => u.id === img.id || u.path === img.path),
  );

  const indexState = await loadProductIndexForMutation();
  const { writes: indexWrites } = indexWritesAfterUpsert(indexState, updated);

  await commitFiles(
    buildMutationFiles({
      binaryWrites,
      jsonWrites: [
        { path: pathFor(id), data: updated },
        ...indexWrites,
      ],
      deletes: removedImages.map((img) => img.path),
    }),
    `chore(data): update product ${slug}`,
  );

  revalidateStorefront(
    CACHE_TAGS.products,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.media,
    {
      productSlugs: [slug, current.slug],
    },
  );
  return updated;
}

export async function updateProductStatus(
  id: string,
  status: Product["status"],
  versao: number,
): Promise<Product> {
  return updateProduct(id, { versao, status });
}

export async function deleteProduct(id: string): Promise<void> {
  const current = await getProductById(id);
  if (!current) throw new AppError("NOT_FOUND", "Produto não encontrado", 404);

  const indexState = await loadProductIndexForMutation();
  const { writes: indexWrites } = indexWritesAfterRemove(indexState, id);

  await commitFiles(
    buildMutationFiles({
      jsonWrites: indexWrites,
      deletes: [pathFor(id), ...current.imagens.map((img) => img.path)],
    }),
    `chore(data): delete product ${current.slug}`,
  );
  revalidateStorefront(
    CACHE_TAGS.products,
    CACHE_TAGS.dashboard,
    CACHE_TAGS.media,
    {
      productSlugs: [current.slug],
    },
  );
}
