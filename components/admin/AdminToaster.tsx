"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";
import "sonner/dist/styles.css";

/** Match admin mobile chrome breakpoint (sidebar drawer / actions bar). */
const ADMIN_MOBILE_MQ = "(max-width: 767.98px)";

/**
 * Shared by Sonner `offset` and `mobileOffset`. Sonner's own mobile breakpoint
 * is 600px; using the same CSS vars on both keeps admin offsets consistent
 * across 600–768px.
 */
const adminToastOffset = {
  top: "var(--admin-toast-offset-top)",
  right: "var(--admin-toast-offset-right)",
  bottom: "var(--admin-toast-offset-bottom)",
  left: "var(--admin-toast-offset-left)",
} as const;

function useIsAdminMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(ADMIN_MOBILE_MQ);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}

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
  const mobile = useIsAdminMobileViewport();

  return (
    <Toaster
      className="admin-toaster"
      position={mobile ? "top-center" : "bottom-right"}
      offset={adminToastOffset}
      mobileOffset={adminToastOffset}
      visibleToasts={1}
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
