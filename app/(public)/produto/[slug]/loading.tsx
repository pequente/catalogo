export default function ProductLoading() {
  return (
    <div className="container storefront-loading storefront-loading--product" aria-busy="true">
      <div className="storefront-loading__product-media skeleton-block" />
      <div className="storefront-loading__product-copy">
        <div className="skeleton-block storefront-loading__title" />
        <div className="skeleton-card__line skeleton-block" />
        <div className="skeleton-card__line skeleton-card__line--short skeleton-block" />
        <div className="skeleton-block storefront-loading__cta" />
      </div>
    </div>
  );
}
