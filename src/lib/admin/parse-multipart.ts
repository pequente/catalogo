import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/src/lib/api/errors";
import type { PendingBinary } from "@/src/services/upload.service";

export type AdminMutationForm<T> = {
  payload: T;
  pendingBinaries: Map<string, PendingBinary>;
};

/**
 * Accepts either JSON body or multipart with:
 * - `payload`: JSON string
 * - `file:<uuid>`: image File entries for deferred commit
 */
export async function parseAdminMutationForm<T = unknown>(
  req: NextRequest,
): Promise<AdminMutationForm<T>> {
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const raw = form.get("payload");
    if (typeof raw !== "string") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Campo payload (JSON) obrigatório no multipart",
        400,
      );
    }
    let payload: T;
    try {
      payload = JSON.parse(raw) as T;
    } catch {
      throw new AppError("VALIDATION_ERROR", "payload JSON inválido", 400);
    }

    const pendingBinaries = new Map<string, PendingBinary>();
    for (const [key, value] of form.entries()) {
      if (!key.startsWith("file:") || !(value instanceof File)) continue;
      const id = key.slice("file:".length);
      if (!id) continue;
      pendingBinaries.set(id, {
        bytes: Buffer.from(await value.arrayBuffer()),
        mime: value.type || "application/octet-stream",
      });
    }
    return { payload, pendingBinaries };
  }

  return {
    payload: (await req.json()) as T,
    pendingBinaries: new Map(),
  };
}
