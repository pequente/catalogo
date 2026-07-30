import { z } from "zod";
import { isoDateSchema, slugSchema, uuidSchema } from "./common";

export const categorySchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  nome: z.string().min(1).max(80),
  slug: slugSchema,
  ordem: z.number().int(),
  ativo: z.boolean(),
  parentId: uuidSchema.nullable().default(null),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
});

export const categoryCreateSchema = z.object({
  nome: z.string().min(1).max(80),
  slug: slugSchema.optional(),
  ordem: z.number().int().optional(),
  ativo: z.boolean().optional(),
  parentId: uuidSchema.nullable().optional(),
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .extend({ versao: z.number().int().min(1) });

export type Category = z.infer<typeof categorySchema>;
