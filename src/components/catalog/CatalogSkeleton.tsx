export function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 4xl:grid-cols-7">
      {Array.from({ length: 21 }).map((_, i) => (
        <div
          key={i}
          className="aspect-[2/3] animate-pulse rounded-[var(--radius)] border border-border/50 bg-bg-surface"
        />
      ))}
    </div>
  );
}
