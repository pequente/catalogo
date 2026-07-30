"use client";

import { useEffect } from "react";

export default function AdminPanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin] route error", error);
  }, [error]);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <h1 className="admin-page__title">Algo deu errado</h1>
          <p className="muted">
            Não foi possível carregar esta tela. Tente novamente; se o problema
            continuar, recarregue a página.
          </p>
        </div>
      </header>
      <div className="admin-page__actions">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
