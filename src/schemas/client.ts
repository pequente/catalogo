import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common";
import { normalizeWaDigits } from "@/src/lib/wa";

const celularStoredSchema = z
  .string()
  .optional()
  .transform((v) => {
    if (!v?.trim()) return undefined;
    return normalizeWaDigits(v) || undefined;
  })
  .refine((v) => v === undefined || (v.length >= 10 && v.length <= 11), {
    message: "Celular inválido",
  });

export const clientSchema = z
  .object({
    id: uuidSchema,
    versao: z.number().int().min(1),
    nome: z.string().trim().min(1, "Informe seu nome").max(120),
    email: z.string().email().max(160).optional(),
    celular: celularStoredSchema,
    criadoEm: isoDateSchema,
    atualizadoEm: isoDateSchema,
  })
  .refine((d) => Boolean(d.email) || Boolean(d.celular), {
    message: "Informe e-mail ou celular",
    path: ["email"],
  });

export const clientUpsertSchema = z
  .object({
    nome: z.string().trim().min(1, "Informe seu nome").max(120),
    email: z.string().trim().max(160).optional(),
    celular: z.string().trim().optional(),
  })
  .superRefine((d, ctx) => {
    const email = d.email?.trim() || "";
    const celularRaw = d.celular?.trim() || "";
    const celular = celularRaw ? normalizeWaDigits(celularRaw) : "";

    if (email && !z.string().email().safeParse(email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "E-mail inválido",
        path: ["email"],
      });
    }
    if (celularRaw && (celular.length < 10 || celular.length > 11)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Celular inválido",
        path: ["celular"],
      });
    }
    if (!email && !celular) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Informe e-mail ou celular",
        path: ["email"],
      });
    }
  })
  .transform((d) => {
    const email = d.email?.trim() || undefined;
    const celularRaw = d.celular?.trim() || "";
    const celular = celularRaw ? normalizeWaDigits(celularRaw) || undefined : undefined;
    return {
      nome: d.nome.trim(),
      email: email || undefined,
      celular,
    };
  });

export type Client = z.infer<typeof clientSchema>;
export type ClientUpsert = z.infer<typeof clientUpsertSchema>;
