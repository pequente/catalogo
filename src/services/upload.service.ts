import "server-only";
import { AppError } from "@/src/lib/api/errors";

const ALLOWED = new Set(["image/jpeg", "image/png"]);
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export type UploadDomain = "produtos" | "banners" | "site";

export type PendingBinary = {
  bytes: Buffer;
  mime: string;
};

export type PreparedImage = {
  id: string;
  path: string;
  bytes: Buffer;
};

export function assertValidImageMime(mime: string): void {
  if (!ALLOWED.has(mime)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Tipo de imagem inválido (jpeg, png)",
      400,
    );
  }
}

export function assertValidImageSize(byteLength: number): void {
  if (byteLength > 10 * 1024 * 1024) {
    throw new AppError("VALIDATION_ERROR", "Imagem maior que 10 MB", 400);
  }
}

/** Validate + assign path for an image that will be committed with the entity. */
export function prepareImageBinary(
  pending: PendingBinary,
  dominio: UploadDomain,
  id = crypto.randomUUID(),
): PreparedImage {
  assertValidImageMime(pending.mime);
  assertValidImageSize(pending.bytes.byteLength);
  const ext = EXT[pending.mime] ?? "jpg";
  return {
    id,
    path: `imagens/${dominio}/${id}.${ext}`,
    bytes: pending.bytes,
  };
}

/** @deprecated Prefer deferred upload via entity multipart save. */
export async function uploadImage(
  file: File,
  dominio: UploadDomain,
): Promise<{ id: string; path: string }> {
  const { writeBinary } = await import("@/src/lib/data");
  const bytes = Buffer.from(await file.arrayBuffer());
  const prepared = prepareImageBinary(
    { bytes, mime: file.type },
    dominio,
  );
  await writeBinary(prepared.path, prepared.bytes, {
    message: `feat(data): upload image ${prepared.path}`,
  });
  return { id: prepared.id, path: prepared.path };
}
