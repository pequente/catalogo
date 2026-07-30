import { requireAdmin } from "@/src/lib/auth/session";
import { AppError } from "@/src/lib/api/errors";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { parseDateOnly } from "@/src/lib/analytics-date";
import {
  getDashboardStats,
  periodForPreset,
  type DashboardPeriodPreset,
} from "@/src/services/dashboard.service";
import { NextRequest } from "next/server";

const PRESETS = new Set<DashboardPeriodPreset>([
  "today",
  "7d",
  "30d",
  "month",
  "custom",
]);

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const presetRaw = sp.get("preset") ?? "7d";
    const preset = (
      PRESETS.has(presetRaw as DashboardPeriodPreset) ? presetRaw : "7d"
    ) as DashboardPeriodPreset;

    let from = sp.get("from") ?? undefined;
    let to = sp.get("to") ?? undefined;

    if (preset !== "custom") {
      const resolved = periodForPreset(preset);
      from = resolved.from;
      to = resolved.to;
    } else {
      if (!from || !to || !parseDateOnly(from) || !parseDateOnly(to) || from > to) {
        throw new AppError(
          "VALIDATION_ERROR",
          "Informe as datas De e Até válidas (AAAA-MM-DD)",
          400,
        );
      }
    }

    const stats = await getDashboardStats(from, to);
    return jsonOk({ ...stats, preset });
  } catch (e) {
    return jsonError(e);
  }
}
