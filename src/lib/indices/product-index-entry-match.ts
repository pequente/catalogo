import {
  productToIndexEntry,
  type ProductIndexEntry,
  type ProductIndexState,
} from "@/src/schemas/product-index";
import type { Product } from "@/src/schemas/product";

export type IndexEntryMatchIssue =
  | { kind: "missing_in_index"; productId: string }
  | { kind: "orphan_in_index"; productId: string }
  | { kind: "entry_mismatch"; productId: string; fields: string[] }
  | {
      kind: "slug_map_mismatch";
      slug: string;
      expectedId: string | null;
      actualId: string | null;
    };

const ENTRY_COMPARE_KEYS: Array<keyof ProductIndexEntry> = [
  "id",
  "nome",
  "slug",
  "referencia",
  "status",
  "destaque",
  "lancamento",
  "preco",
  "precoPromocional",
  "capa",
  "estoqueTotal",
  "variantesCount",
  "precoExibicao",
  "mostrarAPartirDe",
  "path",
  "atualizadoEm",
];

function stableStringify(value: unknown): string {
  return JSON.stringify(value);
}

/** Diff index entry fields against `productToIndexEntry(product)`. */
export function diffIndexEntryAgainstProduct(
  entry: ProductIndexEntry,
  product: Product,
): string[] {
  const expected = productToIndexEntry(product);
  const fields: string[] = [];

  for (const key of ENTRY_COMPARE_KEYS) {
    if (stableStringify(entry[key]) !== stableStringify(expected[key])) {
      fields.push(key);
    }
  }

  if (
    stableStringify([...entry.categoriasIds].sort()) !==
    stableStringify([...expected.categoriasIds].sort())
  ) {
    fields.push("categoriasIds");
  }
  if (
    stableStringify(entry.facetas) !== stableStringify(expected.facetas)
  ) {
    fields.push("facetas");
  }
  if (
    stableStringify([...entry.cores].sort()) !==
    stableStringify([...expected.cores].sort())
  ) {
    fields.push("cores");
  }

  return [...new Set(fields)];
}

/**
 * Pure check used by CRUD tests: after upsert/remove, every product in
 * `products` must match its index entry (and removed ids must be absent).
 */
export function assertProductsMatchIndexState(
  state: ProductIndexState,
  products: Product[],
  removedIds: string[] = [],
): IndexEntryMatchIssue[] {
  const issues: IndexEntryMatchIssue[] = [];
  const byId = new Map(state.entries.map((e) => [e.id, e]));

  for (const product of products) {
    const entry = byId.get(product.id);
    if (!entry) {
      issues.push({ kind: "missing_in_index", productId: product.id });
      continue;
    }
    const fields = diffIndexEntryAgainstProduct(entry, product);
    if (fields.length > 0) {
      issues.push({ kind: "entry_mismatch", productId: product.id, fields });
    }
    if (state.bySlug[product.slug] !== product.id) {
      issues.push({
        kind: "slug_map_mismatch",
        slug: product.slug,
        expectedId: product.id,
        actualId: state.bySlug[product.slug] ?? null,
      });
    }
  }

  for (const id of removedIds) {
    if (byId.has(id)) {
      issues.push({ kind: "orphan_in_index", productId: id });
    }
  }

  return issues;
}
