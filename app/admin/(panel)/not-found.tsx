import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <p className="admin-page__eyebrow">Erro</p>
        <h1 className="admin-page__title">Página não encontrada</h1>
        <p className="admin-page__desc">
          Esta rota não existe no painel ou o recurso foi removido.
        </p>
      </header>

      <section className="admin-panel">
        <div className="admin-empty">
          <span className="admin-empty__icon" aria-hidden>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
          </span>
          <p>Volte ao início do painel para continuar gerenciando a loja.</p>
          <Link className="btn btn-primary btn-sm" href="/admin">
            Ir para o painel
          </Link>
        </div>
      </section>
    </div>
  );
}
