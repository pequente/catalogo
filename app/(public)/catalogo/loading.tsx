export default function CatalogoLoading() {
  return (
    <div className="container storefront-loading catalog-page" aria-busy="true">
      <div className="catalog-page__head">
        <div className="skeleton-block storefront-loading__title" />
        <div className="skeleton-block" style={{ width: 72, height: 16 }} />
      </div>
      <div className="storefront-loading__filters catalog-filters__toolbar">
        <div className="skeleton-block storefront-loading__filter" style={{ flex: 1 }} />
        <div className="skeleton-block storefront-loading__filter" style={{ width: 96 }} />
      </div>
      <div className="storefront-loading__grid">
        {Array.from({ length: 8 }).map((_, i) => (
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
