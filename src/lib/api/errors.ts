export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

export function toErrorResponse(e: unknown) {
  if (isAppError(e)) {
    return {
      status: e.status,
      body: {
        error: { code: e.code, message: e.message, details: e.details },
      },
    };
  }
  if (e instanceof Error && (e as { code?: string }).code === "INVALID_PATH") {
    return {
      status: 400,
      body: {
        error: { code: "INVALID_PATH", message: e.message },
      },
    };
  }
  if (e instanceof Error && (e as { code?: string }).code === "STORAGE_BUSY") {
    return {
      status: 503,
      body: {
        error: {
          code: "STORAGE_BUSY",
          message: "Armazenamento ocupado. Tente novamente.",
        },
      },
    };
  }
  if (e instanceof Error && (e as { code?: string }).code === "REF_CONFLICT") {
    return {
      status: 409,
      body: {
        error: {
          code: "REF_CONFLICT",
          message:
            "Não foi possível gravar (conflito de armazenamento). Tente novamente.",
        },
      },
    };
  }
  if (
    e instanceof Error &&
    (e as { code?: string }).code === "VERSION_CONFLICT"
  ) {
    return {
      status: 409,
      body: {
        error: {
          code: "VERSION_CONFLICT",
          message: "Versão desatualizada. Recarregue e tente novamente.",
        },
      },
    };
  }
  console.error(e);
  return {
    status: 500,
    body: {
      error: { code: "STORAGE_ERROR", message: "Erro interno de armazenamento" },
    },
  };
}
