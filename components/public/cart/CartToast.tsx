"use client";

import { useEffect } from "react";

export function CartToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDismiss, 3000);
    return () => window.clearTimeout(t);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div className="cart-toast" role="status" aria-live="polite">
      <p className="cart-toast__text">{message}</p>
    </div>
  );
}
