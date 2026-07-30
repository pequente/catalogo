export default function PublicLoading() {
  return (
    <div className="container storefront-loading" aria-busy="true" aria-live="polite">
      <p className="storefront-loading__label">Carregando…</p>
      <div className="storefront-loading__hero skeleton-block" />
      <div className="storefront-loading__grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-card__thumb skeleton-block" />
            <div className="skeleton-card__line skeleton-block" />
            <div className="skeleton-card__line skeleton-card__line--short skeleton-block" />
          </div>
        ))}
      </div>
    </div>
  );
}
