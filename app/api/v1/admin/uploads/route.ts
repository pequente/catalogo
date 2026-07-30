import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { uploadImage, type UploadDomain } from "@/src/services/upload.service";

/** @deprecated Prefer deferred upload via entity multipart save. */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const form = await req.formData();
    const file = form.get("file");
    const dominio = String(form.get("dominio") ?? "produtos") as UploadDomain;
    if (!(file instanceof File)) {
      throw new AppError("VALIDATION_ERROR", "Arquivo obrigatório", 400);
    }
    if (!["produtos", "banners", "site"].includes(dominio)) {
      throw new AppError("VALIDATION_ERROR", "dominio inválido", 400);
    }
    const result = await uploadImage(file, dominio);
    return jsonOk(result, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
