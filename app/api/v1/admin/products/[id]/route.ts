import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { parseAdminMutationForm } from "@/src/lib/admin/parse-multipart";
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/src/services/products.service";
import { productUpdateSchema } from "@/src/schemas/product";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const product = await getProductById(id);
    if (!product) throw new AppError("NOT_FOUND", "Produto não encontrado", 404);
    return jsonOk(product);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const { payload, pendingBinaries } = await parseAdminMutationForm(req);
    const body = productUpdateSchema.parse(payload);
    return jsonOk(await updateProduct(id, body, pendingBinaries));
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await deleteProduct(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
