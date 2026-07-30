import type { ProductVariant } from "@/src/schemas/product";
import { variantAttr } from "@/src/schemas/product";

function uniquePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function uniqueDimensionValues(
  variantes: ProductVariant[],
  dimensionId: string,
): string[] {
  return uniquePreserveOrder(
    variantes
      .map((v) => variantAttr(v, dimensionId))
      .filter((v): v is string => Boolean(v?.trim())),
  );
}

/** @deprecated Prefer uniqueDimensionValues(variantes, "tamanho") */
export function uniqueTamanhos(variantes: ProductVariant[]): string[] {
  return uniqueDimensionValues(variantes, "tamanho");
}

/** @deprecated Prefer uniqueDimensionValues(variantes, "cor") */
export function uniqueCores(variantes: ProductVariant[]): string[] {
  return uniqueDimensionValues(variantes, "cor");
}

export type VariantSelection = Record<string, string | null>;

export function selectionComplete(
  dimensionIds: string[],
  selection: VariantSelection,
): boolean {
  return dimensionIds.every((id) => Boolean(selection[id]?.trim()));
}

export function findVariantBySelection(
  variantes: ProductVariant[],
  selection: VariantSelection,
): ProductVariant | null {
  const entries = Object.entries(selection).filter(
    ([, v]) => v != null && v.trim() !== "",
  ) as Array<[string, string]>;
  if (entries.length === 0) return null;
  return (
    variantes.find((variant) =>
      entries.every(([dimId, val]) => {
        const attr = variantAttr(variant, dimId);
        return attr?.trim().toLowerCase() === val.trim().toLowerCase();
      }),
    ) ?? null
  );
}

export function findVariant(
  variantes: ProductVariant[],
  tamanho: string | null,
  cor: string | null,
): ProductVariant | null {
  return findVariantBySelection(variantes, {
    tamanho,
    cor,
  });
}

export function isDimensionValueAvailable(
  variantes: ProductVariant[],
  dimensionId: string,
  value: string,
  otherSelection: VariantSelection,
): boolean {
  const valNorm = value.trim().toLowerCase();
  return variantes.some((v) => {
    const attr = variantAttr(v, dimensionId);
    if (attr?.trim().toLowerCase() !== valNorm) return false;
    for (const [otherId, otherVal] of Object.entries(otherSelection)) {
      if (otherId === dimensionId || !otherVal?.trim()) continue;
      const o = variantAttr(v, otherId);
      if (o?.trim().toLowerCase() !== otherVal.trim().toLowerCase()) {
        return false;
      }
    }
    return v.estoque > 0;
  });
}

/** @deprecated */
export function isTamanhoAvailable(
  variantes: ProductVariant[],
  tamanho: string,
  cor: string | null,
): boolean {
  return isDimensionValueAvailable(variantes, "tamanho", tamanho, { cor });
}

/** @deprecated */
export function isCorAvailable(
  variantes: ProductVariant[],
  cor: string,
  tamanho: string | null,
): boolean {
  return isDimensionValueAvailable(variantes, "cor", cor, { tamanho });
}

export function combinationExistsForSelection(
  variantes: ProductVariant[],
  selection: VariantSelection,
): boolean {
  return findVariantBySelection(variantes, selection) != null;
}

/** @deprecated */
export function combinationExists(
  variantes: ProductVariant[],
  tamanho: string,
  cor: string,
): boolean {
  return findVariant(variantes, tamanho, cor) != null;
}
