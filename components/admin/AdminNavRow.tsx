"use client";

import type { KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest("a, button, input, select, textarea, label, [role='button']"),
  );
}

export function AdminNavRow({
  href,
  children,
  label,
}: {
  href: string;
  children: ReactNode;
  /** Accessible name for the row (e.g. product or order summary). */
  label: string;
}) {
  const router = useRouter();

  function navigate() {
    router.push(href);
  }

  function onClick(e: MouseEvent<HTMLTableRowElement>) {
    if (isInteractiveTarget(e.target)) return;
    // Allow text selection without navigating
    if (window.getSelection()?.toString()) return;
    navigate();
  }

  function onKeyDown(e: KeyboardEvent<HTMLTableRowElement>) {
    if (e.key !== "Enter" && e.key !== " ") return;
    if (isInteractiveTarget(e.target)) return;
    e.preventDefault();
    navigate();
  }

  return (
    <tr
      className="admin-table__row--clickable"
      tabIndex={0}
      role="link"
      aria-label={label}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      {children}
    </tr>
  );
}
