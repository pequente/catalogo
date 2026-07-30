import { z } from "zod";
import { productFromPrice } from "@/src/lib/front/pricing";
import { coverImage } from "@/src/lib/front/media";
import {
  buildVariantFacets,
  productStatusSchema,
  type Product,
} from "@/src/schemas/product";
import { uuidSchema } from "@/src/schemas/common";

/** Cover thumb for list rows / cards — one image only. */
export const productListCoverSchema = z.object({
  path: z.string().min(1),
  alt: z.string().optional(),
});

/**
 * Lean product DTO for list HTML / API pages.
 * Excludes long `descricao`, full `imagens[]`, and full `variantes[]`.
 */
export const productListItemSchema = z.object({
  id: uuidSchema,
  nome: z.string(),
  slug: z.string(),
  referencia: z.string(),
  status: productStatusSchema,
  destaque: z.boolean(),
  lancamento: z.boolean(),
  preco: z.number(),
  precoPromocional: z.number().nullable(),
  categoriasIds: z.array(uuidSchema),
  capa: productListCoverSchema.nullable(),
  estoqueTotal: z.number().int().min(0),
  variantesCount: z.number().int().min(0),
  /** Precomputed display sell price (global or min active variant). */
  precoExibicao: z.number(),
  /** True when card should show "A partir de". */
  mostrarAPartirDe: z.boolean(),
  /** Unique attribute values per dimension id (catalog facets). */
  facetas: z.record(z.array(z.string())),
  /** @deprecated Derived from facetas.tamanho — kept for index compat. */
  tamanhos: z.array(z.string()),
  /** @deprecated Derived from facetas.cor — kept for index compat. */
  cores: z.array(z.string()),
});

export type ProductListItem = z.infer<typeof productListItemSchema>;
export type ProductListCover = z.infer<typeof productListCoverSchema>;

/** Map a full Product entity to the list DTO (pure, no I/O). */
export function toProductListItem(product: Product): ProductListItem {
  const cover = coverImage(product);
  const fromPrice = productFromPrice(product);
  const facetas = buildVariantFacets(product.variantes);
  const tamanhos = facetas.tamanho ?? [];
  const cores = facetas.cor ?? [];

  return {
    id: product.id,
    nome: product.nome,
    slug: product.slug,
    referencia: product.referencia ?? "",
    status: product.status,
    destaque: product.destaque,
    lancamento: product.lancamento,
    preco: product.preco,
    precoPromocional: product.precoPromocional,
    categoriasIds: product.categoriasIds,
    capa: cover
      ? { path: cover.path, alt: cover.alt }
      : null,
    estoqueTotal: product.variantes.reduce((sum, v) => sum + v.estoque, 0),
    variantesCount: product.variantes.length,
    precoExibicao: fromPrice.sell,
    mostrarAPartirDe: fromPrice.showFrom,
    facetas,
    tamanhos,
    cores,
  };
}

export function toProductListItems(products: Product[]): ProductListItem[] {
  return products.map(toProductListItem);
}

/** Compare-at price for strikethrough on list cards. */
export function listItemCompareAt(item: ProductListItem): number | null {
  if (item.mostrarAPartirDe) {
    return item.precoExibicao < item.preco ? item.preco : null;
  }
  if (item.precoPromocional != null) return item.preco;
  return null;
}

export function listItemSell(item: ProductListItem): number {
  if (item.mostrarAPartirDe) return item.precoExibicao;
  return item.precoPromocional ?? item.preco;
}
