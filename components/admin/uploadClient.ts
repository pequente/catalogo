/**
 * Client helpers for deferred image upload (files sent with entity save).
 */

export type UploadDomain = "produtos" | "banners" | "site";

const ALLOWED = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 10 * 1024 * 1024;
/** Soft UX hint; server still accepts up to 10 MB. */
export const UPLOAD_SOFT_LIMIT_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) {
    return "Use JPEG ou PNG.";
  }
  if (file.size > MAX_BYTES) {
    return "Imagem maior que 10 MB.";
  }
  return null;
}

export type PendingImageMeta = {
  id: string;
  path: string;
  alt?: string;
  /** Local File held until form submit (not yet on server). */
  file?: File;
  /** Object URL for local preview. */
  previewUrl?: string;
};

export function createLocalImageDraft(
  file: File,
  opts?: { alt?: string },
): PendingImageMeta {
  const validation = validateImageFile(file);
  if (validation) throw new Error(validation);
  const id = crypto.randomUUID();
  return {
    id,
    path: "",
    alt: opts?.alt,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function revokePreviewUrl(url: string | undefined) {
  if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
}

/**
 * Build multipart body: JSON payload + `file:<id>` for each pending File.
 * Existing images keep path in payload; pending ones set `pending: true`.
 */
export function buildMutationFormData(
  payload: Record<string, unknown>,
  files: { id: string; file: File }[],
): FormData {
  const form = new FormData();
  form.set("payload", JSON.stringify(payload));
  for (const { id, file } of files) {
    form.append(`file:${id}`, file, file.name);
  }
  return form;
}
