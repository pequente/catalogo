export default function AdminLoading() {
  return (
    <div className="admin-page admin-loading" aria-busy="true" aria-live="polite">
      <div className="admin-loading__header">
        <div className="admin-loading__eyebrow skeleton-block" />
        <div className="admin-loading__title skeleton-block" />
        <div className="admin-loading__desc skeleton-block" />
      </div>
      <div className="admin-loading__metrics">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="admin-loading__metric skeleton-block" />
        ))}
      </div>
      <div className="admin-loading__panel skeleton-block" />
    </div>
  );
}
