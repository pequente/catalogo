import { adminFieldLabel } from "@/src/lib/admin/field-labels";

/** Contrato JSON: `{ error: { code, message, details? } }` */
export type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export type ZodFlattenDetails = {
  formErrors: string[];
  fieldErrors: Record<string, string[]>;
};

export type FormattedApiError = {
  title: string;
  lines: string[];
  fieldErrors: Record<string, string[]>;
  code: string;
  status: number;
};

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly displayTitle: string;
  readonly displayLines: string[];
  readonly fieldErrors: Record<string, string[]>;

  constructor(formatted: FormattedApiError) {
    super(formatted.lines[0] ?? formatted.title);
    this.name = "ApiClientError";
    this.code = formatted.code;
    this.status = formatted.status;
    this.displayTitle = formatted.title;
    this.displayLines = formatted.lines;
    this.fieldErrors = formatted.fieldErrors;
  }
}

export function isApiClientError(e: unknown): e is ApiClientError {
  return e instanceof ApiClientError;
}

function isZodFlattenDetails(details: unknown): details is ZodFlattenDetails {
  if (!details || typeof details !== "object") return false;
  const d = details as ZodFlattenDetails;
  return (
    Array.isArray(d.formErrors) &&
    d.fieldErrors != null &&
    typeof d.fieldErrors === "object"
  );
}

export function extractApiError(
  data: unknown,
): ApiErrorPayload | null {
  if (!data || typeof data !== "object") return null;
  const err = (data as { error?: ApiErrorPayload }).error;
  if (!err || typeof err !== "object") return null;
  if (typeof err.code !== "string" || typeof err.message !== "string") {
    return null;
  }
  return err;
}

function titleForCode(code: string, message: string): string {
  switch (code) {
    case "VALIDATION_ERROR":
      return "Revise os campos";
    case "UNAUTHORIZED":
      // Login e sessão compartilham o mesmo código HTTP/API
      if (message === "Credenciais inválidas") return message;
      return "Sessão expirada";
    case "NOT_FOUND":
      return "Não encontrado";
    case "CONFLICT_SLUG":
      return "Conflito de identificador";
    case "VERSION_CONFLICT":
      return message || "Versão desatualizada";
    case "REF_CONFLICT":
      return message || "Conflito de armazenamento";
    case "RATE_LIMITED":
      return "Muitas tentativas";
    case "STORAGE_BUSY":
      return message || "Armazenamento ocupado";
    case "STORAGE_ERROR":
      return "Erro ao salvar dados";
    default:
      return message || "Algo deu errado";
  }
}

export function formatApiErrorForUser(
  error: ApiErrorPayload,
  status = 400,
): FormattedApiError {
  const fieldErrors: Record<string, string[]> = {};
  const lines: string[] = [];

  if (isZodFlattenDetails(error.details)) {
    for (const msg of error.details.formErrors) {
      if (msg) lines.push(msg);
    }
    for (const [key, msgs] of Object.entries(error.details.fieldErrors)) {
      if (!msgs?.length) continue;
      fieldErrors[key] = msgs;
      const label = adminFieldLabel(key);
      for (const msg of msgs) {
        lines.push(`${label}: ${msg}`);
      }
    }
  }

  if (lines.length === 0) {
    const generic =
      error.message === "Dados inválidos" ||
      error.message === "Filtros inválidos";
    if (!generic || !isZodFlattenDetails(error.details)) {
      if (error.message) lines.push(error.message);
    }
  }

  if (lines.length === 0) {
    lines.push("Verifique os dados e tente novamente.");
  }

  const title = titleForCode(error.code, error.message);
  // Evita título + descrição idênticos no toast (ex.: login com senha errada)
  const uniqueLines = lines.filter((line) => line !== title);

  return {
    title,
    lines: uniqueLines,
    fieldErrors,
    code: error.code,
    status,
  };
}

export function apiClientErrorFromResponse(
  status: number,
  data: unknown,
  fallbackMessage = "Erro na operação",
): ApiClientError {
  const payload = extractApiError(data);
  if (payload) {
    return new ApiClientError(formatApiErrorForUser(payload, status));
  }
  return new ApiClientError({
    title: fallbackMessage,
    lines: [fallbackMessage],
    fieldErrors: {},
    code: "UNKNOWN",
    status,
  });
}
