export function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-[var(--radius)] bg-bg-surface"
        />
      ))}
    </div>
  );
}
