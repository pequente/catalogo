import { z } from "zod";

export const WA_USER_TEXT_NO_PLACEHOLDER_MSG =
  "Não use chaves { } neste campo — elas são reservadas para dados automáticos da mensagem.";

export function assertNoPlaceholderInUserText(value: string): boolean {
  return !value.includes("{");
}

const userTextField = (max: number) =>
  z
    .string()
    .max(max)
    .refine(assertNoPlaceholderInUserText, {
      message: WA_USER_TEXT_NO_PLACEHOLDER_MSG,
    });

export const productWaTemplatePartsSchema = z.object({
  intro: z
    .string()
    .trim()
    .min(1, "Informe o título da mensagem")
    .max(200)
    .refine(assertNoPlaceholderInUserText, {
      message: WA_USER_TEXT_NO_PLACEHOLDER_MSG,
    }),
  includeVariantDetails: z.boolean(),
  includeUrl: z.boolean(),
  outro: userTextField(500),
});

export const cartWaTemplatePartsSchema = z.object({
  beforeItens: userTextField(500),
  outro: userTextField(500),
});

export const compactCartItemBulletSchema = z.enum(["•", "-", "none"]);

export const compactCartItemPartsSchema = z.object({
  bullet: compactCartItemBulletSchema,
  showResumo: z.boolean(),
  showUrl: z.boolean(),
});

export type ProductWaTemplatePartsInput = z.infer<
  typeof productWaTemplatePartsSchema
>;
export type CartWaTemplatePartsInput = z.infer<
  typeof cartWaTemplatePartsSchema
>;
export type CompactCartItemPartsInput = z.infer<
  typeof compactCartItemPartsSchema
>;
