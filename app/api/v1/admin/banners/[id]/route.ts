import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { parseAdminMutationForm } from "@/src/lib/admin/parse-multipart";
import {
  deleteBanner,
  getBanner,
  updateBanner,
} from "@/src/services/banners.service";
import { bannerUpdateSchema } from "@/src/schemas/banner";
import { z } from "zod";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const item = await getBanner(id);
    if (!item) throw new AppError("NOT_FOUND", "Banner não encontrado", 404);
    return jsonOk(item);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const { payload, pendingBinaries } = await parseAdminMutationForm(req);
    const body = bannerUpdateSchema.parse(payload);
    return jsonOk(await updateBanner(id, body, pendingBinaries));
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
    await deleteBanner(id);
    return jsonOk({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
