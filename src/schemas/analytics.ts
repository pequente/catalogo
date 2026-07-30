import { z } from "zod";
import { uuidSchema } from "./common";

export const waSourceSchema = z.enum([
  "home",
  "home_strip",
  "header",
  "mobile_nav",
  "sobre",
  "pdp",
  "footer",
  "cart",
]);

export const analyticsPageviewEventSchema = z.object({
  type: z.literal("pageview"),
  path: z.string().min(1).max(300),
});

export const analyticsHeartbeatEventSchema = z.object({
  type: z.literal("heartbeat"),
  durationMs: z.number().int().min(0).max(120_000),
});

export const analyticsWaClickEventSchema = z.object({
  type: z.literal("wa_click"),
  source: waSourceSchema,
  produtoId: uuidSchema.optional(),
});

export const analyticsClientLinkEventSchema = z.object({
  type: z.literal("client_link"),
  clienteId: uuidSchema,
});

export const analyticsEventSchema = z.discriminatedUnion("type", [
  analyticsPageviewEventSchema,
  analyticsHeartbeatEventSchema,
  analyticsWaClickEventSchema,
  analyticsClientLinkEventSchema,
]);

export const analyticsBatchSchema = z.object({
  sessionId: uuidSchema,
  clienteId: uuidSchema.optional(),
  events: z.array(analyticsEventSchema).min(1).max(50),
});

const recordCountSchema = z.record(z.string(), z.number().int().min(0));

export const dailyAnalyticsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pageviews: z.number().int().min(0),
  byPath: recordCountSchema,
  sessions: z.number().int().min(0),
  sessionDurationMs: z.number().int().min(0),
  waClicks: z.number().int().min(0),
  waBySource: recordCountSchema,
  waByProdutoId: recordCountSchema,
  leadsLinked: z.number().int().min(0),
  seenSessionIds: z.array(uuidSchema).max(5000),
  linkedSessionIds: z.array(uuidSchema).max(5000),
});

export type WaSource = z.infer<typeof waSourceSchema>;
export type AnalyticsEvent = z.infer<typeof analyticsEventSchema>;
export type AnalyticsBatch = z.infer<typeof analyticsBatchSchema>;
export type DailyAnalytics = z.infer<typeof dailyAnalyticsSchema>;
