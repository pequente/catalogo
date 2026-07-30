import "server-only";
import { listJsonDir, readJson } from "@/src/lib/data";
import { normalizeProductReferencia } from "@/src/lib/product-referencia";
import { diffIndexEntryAgainstProduct } from "@/src/lib/indices/product-index-entry-match";
import type { ProductIndexState } from "@/src/schemas/product-index";
import { productSchema, type Product } from "@/src/schemas/product";

export type IndexConsistencyIssue =
  | {
      kind: "count_mismatch";
      indexTotal: number;
      fileCount: number;
      validFileCount: number;
    }
  | { kind: "missing_in_index"; productId: string }
  | { kind: "orphan_in_index"; productId: string }
  | { kind: "invalid_entity"; path: string; detail?: string }
  | {
      kind: "entry_mismatch";
      productId: string;
      fields: string[];
    }
  | {
      kind: "slug_map_mismatch";
      slug: string;
      expectedId: string | null;
      actualId: string | null;
    }
  | {
      kind: "referencia_map_mismatch";
      referencia: string;
      expectedId: string | null;
      actualId: string | null;
    };

export type IndexConsistencyReport = {
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  validFileCount: number;
  checkedEntries: number;
  issues: IndexConsistencyIssue[];
};

export {
  assertProductsMatchIndexState,
  diffIndexEntryAgainstProduct,
} from "@/src/lib/indices/product-index-entry-match";

/**
 * Deep audit: every `produtos/*.json` ↔ index entry field parity + secondary maps.
 * Prefer this over count-only checks for repair/CI (Fase 5).
 * Pass `null` when the index files are missing.
 */
export async function auditProductIndexConsistency(
  state: ProductIndexState | null,
): Promise<IndexConsistencyReport> {
  const files = await listJsonDir("produtos");
  const issues: IndexConsistencyIssue[] = [];

  const products: Product[] = [];
  const validIds = new Set<string>();

  for (const file of files) {
    const rel = `produtos/${file}`;
    const raw = await readJson<unknown>(rel);
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({
        kind: "invalid_entity",
        path: rel,
        detail: parsed.error.issues[0]?.message,
      });
      continue;
    }
    products.push(parsed.data);
    validIds.add(parsed.data.id);
  }

  const indexTotal = state?.entries.length ?? -1;
  const validFileCount = products.length;

  if (!state) {
    if (files.length > 0) {
      issues.push({
        kind: "count_mismatch",
        indexTotal: -1,
        fileCount: files.length,
        validFileCount,
      });
    }
    return {
      ok: issues.length === 0 && files.length === 0,
      indexTotal,
      fileCount: files.length,
      validFileCount,
      checkedEntries: 0,
      issues,
    };
  }

  if (indexTotal !== validFileCount) {
    issues.push({
      kind: "count_mismatch",
      indexTotal,
      fileCount: files.length,
      validFileCount,
    });
  }

  const indexById = new Map(state.entries.map((e) => [e.id, e]));

  for (const product of products) {
    const entry = indexById.get(product.id);
    if (!entry) {
      issues.push({ kind: "missing_in_index", productId: product.id });
      continue;
    }
    const fields = diffIndexEntryAgainstProduct(entry, product);
    if (fields.length > 0) {
      issues.push({ kind: "entry_mismatch", productId: product.id, fields });
    }
  }

  for (const entry of state.entries) {
    if (!validIds.has(entry.id)) {
      issues.push({ kind: "orphan_in_index", productId: entry.id });
    }
  }

  for (const product of products) {
    const mapped = state.bySlug[product.slug] ?? null;
    if (mapped !== product.id) {
      issues.push({
        kind: "slug_map_mismatch",
        slug: product.slug,
        expectedId: product.id,
        actualId: mapped,
      });
    }
    const refKey = normalizeProductReferencia(product.referencia).toLowerCase();
    if (refKey) {
      const refMapped = state.byReferencia[refKey] ?? null;
      if (refMapped !== product.id) {
        issues.push({
          kind: "referencia_map_mismatch",
          referencia: refKey,
          expectedId: product.id,
          actualId: refMapped,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    indexTotal,
    fileCount: files.length,
    validFileCount,
    checkedEntries: products.length,
    issues,
  };
}
