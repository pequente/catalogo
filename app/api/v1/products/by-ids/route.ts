import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { getProductsByIds } from "@/src/services/products.service";
import { uuidSchema } from "@/src/schemas/common";
import { z } from "zod";

const MAX_IDS = 50;

/**
 * GET /api/v1/products/by-ids?ids=uuid,uuid
 * Resolves only the requested products (cart / selective hydrate).
 */
export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("ids") ?? "";
    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return jsonOk({ items: [] as Awaited<ReturnType<typeof getProductsByIds>> });
    }
    if (ids.length > MAX_IDS) {
      throw new AppError(
        "VALIDATION_ERROR",
        `No máximo ${MAX_IDS} ids por request`,
        400,
      );
    }

    for (const id of ids) {
      uuidSchema.parse(id);
    }

    const items = await getProductsByIds(ids);
    return jsonOk({ items });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "ids inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
