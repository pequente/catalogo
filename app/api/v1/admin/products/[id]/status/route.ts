import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { updateProductStatus } from "@/src/services/products.service";
import { productStatusUpdateSchema } from "@/src/schemas/product";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const body = productStatusUpdateSchema.parse(await req.json());
    return jsonOk(await updateProductStatus(id, body.status, body.versao));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
