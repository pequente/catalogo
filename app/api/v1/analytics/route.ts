import { NextRequest } from "next/server";
import { z } from "zod";
import { AppError } from "@/src/lib/api/errors";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { dateInSaoPaulo } from "@/src/lib/analytics-date";
import { rateLimit } from "@/src/lib/rate-limit";
import { analyticsBatchSchema } from "@/src/schemas/analytics";
import { ingestAnalyticsBatch } from "@/src/services/analytics.service";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!rateLimit(`analytics:${ip}`, 60, 60_000)) {
      throw new AppError("RATE_LIMITED", "Muitas requisições", 429);
    }

    const body = analyticsBatchSchema.parse(await req.json());
    const date = dateInSaoPaulo();
    await ingestAnalyticsBatch(body, date);
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
