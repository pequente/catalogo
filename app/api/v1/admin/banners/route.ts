import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { parseAdminMutationForm } from "@/src/lib/admin/parse-multipart";
import { createBanner } from "@/src/services/banners.service";
import { getCachedAllBanners } from "@/src/lib/cache/storefront-reads";
import { bannerCreateSchema } from "@/src/schemas/banner";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ items: await getCachedAllBanners() });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { payload, pendingBinaries } = await parseAdminMutationForm(req);
    const body = bannerCreateSchema.parse(payload);
    return jsonOk(await createBanner(body, pendingBinaries), { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
