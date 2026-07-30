import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { parseAdminMutationForm } from "@/src/lib/admin/parse-multipart";
import {
  getSiteConfigTab,
  updateSiteConfig,
  updateSiteConfigTabs,
} from "@/src/services/site-config.service";
import { getSiteConfig } from "@/src/services/site-config.service";
import { siteConfigUpdateSchema } from "@/src/schemas/site-config";
import {
  SITE_CONFIG_TAB_IDS,
  siteConfigTabIdSchema,
  type SiteConfigTabId,
} from "@/src/schemas/site-config-tabs";
import { z } from "zod";

const tabBatchSchema = z.object({
  versao: z.number().int().min(1),
  tabs: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => Object.keys(obj).length > 0,
      "Informe ao menos uma aba em tabs",
    ),
});

/** Map legacy tab query/body keys to the canonical `geral` tab. */
function canonicalizeTabKey(value: string): string {
  if (value === "identidade" || value === "painel") return "geral";
  return value;
}

function parseTabParam(value: string | null): SiteConfigTabId | null {
  if (!value) return null;
  const parsed = siteConfigTabIdSchema.safeParse(canonicalizeTabKey(value));
  return parsed.success ? parsed.data : null;
}

function extractLegacyPainelMeta(data: unknown): number | null | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const painel = (data as Record<string, unknown>).painel;
  if (!painel || typeof painel !== "object" || Array.isArray(painel)) {
    return undefined;
  }
  const meta = (painel as Record<string, unknown>).metaReceitaMensal;
  if (meta === null) return null;
  if (typeof meta === "number") return meta;
  return undefined;
}

/**
 * Normalize PUT `tabs` so legacy `identidade` / `painel` merge into `geral`.
 */
function normalizeTabsPayload(
  tabs: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, data] of Object.entries(tabs)) {
    const canon = canonicalizeTabKey(key);
    if (canon === "geral") {
      const current =
        out.geral && typeof out.geral === "object" && !Array.isArray(out.geral)
          ? { ...(out.geral as Record<string, unknown>) }
          : {};
      if (key === "painel") {
        const meta = extractLegacyPainelMeta(data);
        if (meta !== undefined) current.metaReceitaMensal = meta;
      } else if (data && typeof data === "object" && !Array.isArray(data)) {
        Object.assign(current, data as Record<string, unknown>);
      }
      out.geral = current;
      continue;
    }
    out[canon] = data;
  }
  return out;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const tab = parseTabParam(req.nextUrl.searchParams.get("tab"));
    if (tab) {
      return jsonOk(await getSiteConfigTab(tab));
    }
    return jsonOk(await getSiteConfig());
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { payload, pendingBinaries } = await parseAdminMutationForm(req);

    // Batch / single-tab update: { versao, tabs: { geral: {...}, ... } }
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      "tabs" in (payload as Record<string, unknown>)
    ) {
      const body = tabBatchSchema.parse(payload);
      const normalizedTabs = normalizeTabsPayload(body.tabs);
      const patches: { tab: SiteConfigTabId; data: unknown }[] = [];
      for (const [key, data] of Object.entries(normalizedTabs)) {
        const tab = siteConfigTabIdSchema.safeParse(key);
        if (!tab.success) {
          throw new AppError(
            "VALIDATION_ERROR",
            `Aba inválida: ${key}. Use: ${SITE_CONFIG_TAB_IDS.join(", ")}`,
            400,
          );
        }
        patches.push({ tab: tab.data, data });
      }
      return jsonOk(
        await updateSiteConfigTabs(body.versao, patches, pendingBinaries),
      );
    }

    // Legacy full update
    const body = siteConfigUpdateSchema.parse(payload);
    return jsonOk(await updateSiteConfig(body, pendingBinaries));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
