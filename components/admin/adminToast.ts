import { createElement, type ReactNode } from "react";
import { toast } from "sonner";
import {
  ApiClientError,
  isApiClientError,
} from "@/src/lib/api/client-error";

const DEFAULT_ERROR_DURATION = 12_000;
const DEFAULT_SUCCESS_DURATION = 2_000;

function linesToDescription(lines: string[]): ReactNode {
  if (lines.length === 0) return undefined;
  if (lines.length === 1) return lines[0];
  return createElement(
    "ul",
    { className: "admin-toast__list" },
    lines.map((line, i) =>
      createElement("li", { key: `${i}-${line.slice(0, 24)}` }, line),
    ),
  );
}

export type AdminToastOptions = {
  id?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function toastMutationError(
  err: unknown,
  options: AdminToastOptions = {},
): void {
  const action = options.action
    ? {
        label: options.action.label,
        onClick: options.action.onClick,
      }
    : undefined;

  if (isApiClientError(err)) {
    toast.error(err.displayTitle, {
      id: options.id,
      description: linesToDescription(err.displayLines),
      duration:
        err.code === "VALIDATION_ERROR" ? DEFAULT_ERROR_DURATION : undefined,
      action,
    });
    return;
  }
  if (err instanceof Error && err.message) {
    toast.error(err.message, { id: options.id, action });
    return;
  }
  toast.error("Algo deu errado. Tente novamente.", {
    id: options.id,
    action,
  });
}

export function toastMutationSuccess(
  message: string,
  options: AdminToastOptions = {},
): void {
  toast.success(message, {
    id: options.id,
    duration: DEFAULT_SUCCESS_DURATION,
  });
}

export function toastMutationWarning(
  message: string,
  options: AdminToastOptions & { description?: ReactNode } = {},
): void {
  toast.warning(message, {
    id: options.id,
    description: options.description,
    duration: DEFAULT_ERROR_DURATION,
  });
}

/** @deprecated prefer isApiClientError from client-error */
export { ApiClientError };
