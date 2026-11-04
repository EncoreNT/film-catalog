export function CatalogSkeleton() {
  return (
    <div className="catalog-skeleton" aria-label="Загрузка каталога" aria-busy="true">
      <div className="mb-6 h-44 animate-pulse rounded-2xl bg-bg-surface" />
      <div className="mb-6 h-32 animate-pulse rounded-2xl bg-bg-surface" />
      <div className="catalog-grid">
        {Array.from({ length: 14 }, (_, i) => <div key={i} className="aspect-[2/4] animate-pulse rounded-2xl border border-border/50 bg-bg-surface" />)}
      </div>
    </div>
  );
}
