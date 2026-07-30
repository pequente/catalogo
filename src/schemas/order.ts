import { z } from "zod";
import { isoDateSchema, uuidSchema } from "./common";

export const orderCanalSchema = z.enum(["whatsapp", "loja_fisica"]);
export const orderStatusSchema = z.enum(["confirmado", "cancelado"]);

export const orderItemSchema = z.object({
  produtoId: uuidSchema,
  varianteId: uuidSchema,
  nomeProduto: z.string().min(1).max(120),
  tamanho: z.string().min(1).max(40),
  cor: z.string().min(1).max(60),
  sku: z.string().max(80).optional(),
  referenciaProduto: z.string().max(80).optional(),
  quantidade: z.number().int().min(1),
  precoUnitario: z.number().min(0),
});

export const orderSchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  status: orderStatusSchema,
  canal: orderCanalSchema,
  clienteId: uuidSchema.nullable().optional(),
  observacao: z.string().max(2000).optional(),
  itens: z.array(orderItemSchema).min(1),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
});

export const orderItemInputSchema = z.object({
  produtoId: uuidSchema,
  varianteId: uuidSchema,
  quantidade: z.number().int().min(1),
  precoUnitario: z.number().min(0).optional(),
});

export const orderCreateSchema = z.object({
  canal: orderCanalSchema.optional(),
  clienteId: uuidSchema.nullable().optional(),
  observacao: z.string().max(2000).optional(),
  itens: z.array(orderItemInputSchema).min(1),
});

export const orderUpdateSchema = z.object({
  versao: z.number().int().min(1),
  canal: orderCanalSchema.optional(),
  clienteId: uuidSchema.nullable().optional(),
  observacao: z.string().max(2000).optional(),
  itens: z.array(orderItemInputSchema).min(1).optional(),
});

export const orderCancelSchema = z.object({
  versao: z.number().int().min(1),
});

export type Order = z.infer<typeof orderSchema>;
export type OrderItem = z.infer<typeof orderItemSchema>;
export type OrderCreate = z.infer<typeof orderCreateSchema>;
export type OrderUpdate = z.infer<typeof orderUpdateSchema>;
export type OrderCanal = z.infer<typeof orderCanalSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
