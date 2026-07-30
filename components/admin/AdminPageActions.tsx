import type { ReactNode } from "react";

/**
 * Page-level admin actions (Editar, Salvar, Voltar, Novo…).
 * Desktop: sits in the page header. Mobile: CSS docks it to a sticky bottom bar.
 */
export function AdminPageActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={["admin-page__actions", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
