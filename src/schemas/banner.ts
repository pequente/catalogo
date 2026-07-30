import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common";

export const bannerPosicaoSchema = z.enum(["hero", "faixa", "promo"]);

export type BannerPosicao = z.infer<typeof bannerPosicaoSchema>;

export const BANNER_POSICAO_LABELS: Record<BannerPosicao, string> = {
  hero: "Topo da loja",
  faixa: "Faixa intermediária",
  promo: "Promoção",
};

export const BANNER_POSICOES = bannerPosicaoSchema.options;

export const bannerImageSchema = z.object({
  id: uuidSchema,
  path: z.string().min(1),
  alt: z.string().optional(),
});

export const bannerImageInputSchema = z
  .object({
    id: uuidSchema,
    path: z.string(),
    alt: z.string().optional(),
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

/**
 * Relative storefront path (`/catalogo`) or absolute http(s) URL.
 * `null`/empty clears the field on update; omit the key to leave unchanged.
 */
export const bannerHrefSchema = z
  .union([z.string().max(500), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  })
  .refine(
    (val) =>
      val === null ||
      val.startsWith("/") ||
      val.startsWith("http://") ||
      val.startsWith("https://"),
    { message: "Use um caminho começando com / ou uma URL http(s)" },
  );

/** Optional CTA label; null/empty clears the field on update. */
export const bannerCtaTextoSchema = z
  .union([z.string().max(80), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const t = v.trim();
    return t ? t : null;
  });

export const bannerSchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  posicao: bannerPosicaoSchema,
  ordem: z.number().int(),
  ativo: z.boolean(),
  ctaTexto: z.string().min(1).max(80).optional(),
  imagem: bannerImageSchema,
  href: z.string().max(500).optional(),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
});

export const bannerCreateSchema = z.object({
  posicao: bannerPosicaoSchema,
  ativo: z.boolean().optional(),
  ordem: z.number().int().optional(),
  href: bannerHrefSchema,
  ctaTexto: bannerCtaTextoSchema,
  imagem: bannerImageInputSchema,
});

export const bannerUpdateSchema = bannerCreateSchema
  .partial()
  .extend({ versao: z.number().int().min(1) });

export type Banner = z.infer<typeof bannerSchema>;
