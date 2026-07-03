interface ScanStatsCardsProps {
  catalog: number;
  draft: number;
}

export function ScanStatsCards({ catalog, draft }: ScanStatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="surface-card p-5">
        <p className="font-mono-tech text-muted">в каталоге</p>
        <p className="font-display mt-1 text-3xl font-bold text-accent">
          {catalog}
        </p>
      </div>
      <div className="surface-card p-5">
        <p className="font-mono-tech text-muted">черновики</p>
        <p className="font-display mt-1 text-3xl font-bold">{draft}</p>
      </div>
    </div>
  );
}
