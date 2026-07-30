"use client";

import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import "sonner/dist/styles.css";

const adminToastIcons = {
  success: (
    <CheckCircle2
      className="admin-toast__icon-svg"
      strokeWidth={2.25}
      aria-hidden
    />
  ),
  error: (
    <AlertCircle
      className="admin-toast__icon-svg"
      strokeWidth={2.25}
      aria-hidden
    />
  ),
  warning: (
    <TriangleAlert
      className="admin-toast__icon-svg"
      strokeWidth={2.25}
      aria-hidden
    />
  ),
} as const;

export function AdminToaster() {
  return (
    <Toaster
      className="admin-toaster"
      position="top-right"
      offset={{ top: "0.75rem", right: "0.75rem" }}
      closeButton
      icons={adminToastIcons}
      toastOptions={{
        classNames: {
          toast: "admin-toast",
          title: "admin-toast__title",
          description: "admin-toast__description",
          icon: "admin-toast__icon",
          success: "admin-toast--success",
          error: "admin-toast--error",
          warning: "admin-toast--warning",
          closeButton: "admin-toast__close",
        },
      }}
    />
  );
}
