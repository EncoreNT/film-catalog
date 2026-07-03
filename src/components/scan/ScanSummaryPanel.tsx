import type { ScanSummary } from "@/lib/media/scanner";

interface ScanSummaryPanelProps {
  summary: ScanSummary;
  cancelled: boolean;
}

export function ScanSummaryPanel({ summary, cancelled }: ScanSummaryPanelProps) {
  return (
    <div className="surface-card p-5">
      <h2 className="font-display mb-4 text-xl font-semibold">Сводка</h2>
      {cancelled ? (
        <p className="font-mono-tech mb-3 text-sm text-accent">
          сканирование отменено — показаны частичные результаты
        </p>
      ) : null}
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-muted">Найдено файлов</dt>
          <dd className="font-mono-tech text-lg">{summary.found}</dd>
        </div>
        <div>
          <dt className="text-muted">Новых черновиков</dt>
          <dd className="font-mono-tech text-lg text-accent">
            {summary.newDrafts}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Обновлено</dt>
          <dd className="font-mono-tech text-lg">{summary.updated}</dd>
        </div>
        <div>
          <dt className="text-muted">Перемещено</dt>
          <dd className="font-mono-tech text-lg">{summary.moved}</dd>
        </div>
        <div>
          <dt className="text-muted">Пропущено</dt>
          <dd className="font-mono-tech text-lg">{summary.skipped}</dd>
        </div>
      </dl>
      {summary.errors.length > 0 ? (
        <div className="mt-4">
          <p className="font-mono-tech text-danger">ошибки</p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {summary.errors.map((entry) => (
              <li key={entry}>{entry}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
