import { z } from "zod";
import { isoDateSchema, slugSchema, uuidSchema } from "./common";

export const productImageSchema = z.object({
  id: uuidSchema,
  path: z.string().min(1),
  alt: z.string().optional(),
  ordem: z.number().int().min(0),
});

/** Input may mark images as pending (file attached in multipart). */
export const productImageInputSchema = z
  .object({
    id: uuidSchema,
    path: z.string(),
    alt: z.string().optional(),
    ordem: z.number().int().min(0),
    pending: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (!val.pending && !val.path.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "path obrigatório quando a imagem não está pendente",
        path: ["path"],
      });
    }
  });

const variantAtributosSchema = z.record(z.string().min(1).max(60));

export function migrateVariantInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  const attrs =
    o.atributos && typeof o.atributos === "object" && !Array.isArray(o.atributos)
      ? { ...(o.atributos as Record<string, string>) }
      : {};
  if (typeof o.tamanho === "string" && o.tamanho.trim()) {
    attrs.tamanho = o.tamanho.trim();
  }
  if (typeof o.cor === "string" && o.cor.trim()) {
    attrs.cor = o.cor.trim();
  }
  delete o.tamanho;
  delete o.cor;
  o.atributos = attrs;
  return o;
}

/** In-place shape migration for product JSON files (variantes tamanho/cor → atributos). */
export function migrateProductDocument(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = { ...(raw as Record<string, unknown>) };
  if (!Array.isArray(o.variantes)) return o;
  o.variantes = o.variantes.map((v) => migrateVariantInput(v));
  return o;
}

export const productVariantSchema = z.preprocess(
  migrateVariantInput,
  z.object({
    id: uuidSchema,
    atributos: variantAtributosSchema.refine(
      (a) => Object.keys(a).length > 0,
      "Informe ao menos um atributo da variante",
    ),
    estoque: z.number().int().min(0),
    preco: z.number().min(0).nullable().optional(),
    sku: z.string().max(80).optional(),
  }),
);

export const productStatusSchema = z.enum(["ativo", "oculto", "esgotado"]);

export const productSchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  nome: z.string().min(1).max(120),
  slug: slugSchema,
  descricao: z.string().max(5000).default(""),
  referencia: z.string().max(80).default(""),
  preco: z.number().min(0),
  precoPromocional: z.number().min(0).nullable(),
  categoriasIds: z.array(uuidSchema).min(1),
  status: productStatusSchema,
  destaque: z.boolean(),
  lancamento: z.boolean(),
  imagens: z.array(productImageSchema).max(12),
  variantes: z.array(productVariantSchema),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
});

export const productCreateSchema = z.object({
  nome: z.string().min(1).max(120),
  slug: slugSchema.optional(),
  descricao: z.string().max(5000).optional(),
  referencia: z.string().max(80).optional(),
  preco: z.number().min(0),
  precoPromocional: z.number().min(0).nullable().optional(),
  categoriasIds: z.array(uuidSchema).min(1),
  status: productStatusSchema.optional(),
  destaque: z.boolean().optional(),
  lancamento: z.boolean().optional(),
  imagens: z.array(productImageInputSchema).max(12).optional(),
  variantes: z.array(productVariantSchema).optional(),
});

export const productUpdateSchema = productCreateSchema
  .partial()
  .extend({ versao: z.number().int().min(1) })
  .superRefine((val, ctx) => {
    if (val.categoriasIds !== undefined && val.categoriasIds.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selecione pelo menos uma categoria",
        path: ["categoriasIds"],
      });
    }
  });

export const productStatusUpdateSchema = z.object({
  status: productStatusSchema,
  versao: z.number().int().min(1),
});

export type Product = z.infer<typeof productSchema>;
export type ProductVariant = z.infer<typeof productVariantSchema>;
export type ProductCreate = z.infer<typeof productCreateSchema>;
export type ProductUpdate = z.infer<typeof productUpdateSchema>;

export function variantAttr(
  variant: ProductVariant,
  dimensionId: string,
): string | undefined {
  const key = dimensionId.trim().toLowerCase();
  for (const [k, v] of Object.entries(variant.atributos)) {
    if (k.trim().toLowerCase() === key) return v;
  }
  return undefined;
}

export function buildVariantFacets(
  variantes: ProductVariant[],
): Record<string, string[]> {
  const out: Record<string, Set<string>> = {};
  for (const v of variantes) {
    for (const [dimId, value] of Object.entries(v.atributos)) {
      const val = value.trim();
      if (!val) continue;
      if (!out[dimId]) out[dimId] = new Set();
      out[dimId].add(val);
    }
  }
  const facetas: Record<string, string[]> = {};
  for (const [dimId, set] of Object.entries(out)) {
    facetas[dimId] = Array.from(set).sort((a, b) =>
      a.localeCompare(b, "pt-BR", { numeric: true }),
    );
  }
  return facetas;
}

/** @deprecated Use variantAttr(variant, "tamanho") */
export function variantTamanho(v: ProductVariant): string {
  return variantAttr(v, "tamanho") ?? "";
}

/** @deprecated Use variantAttr(variant, "cor") */
export function variantCor(v: ProductVariant): string {
  return variantAttr(v, "cor") ?? "";
}
