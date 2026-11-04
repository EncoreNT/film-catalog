import { ChevronRight, Clock, HardDrive } from "lucide-react";
import type { ArchiveMetrics, ArchiveTotals } from "@/lib/catalog/archive-metrics";
import { ARCHIVE_QUALITY_METRIC_DEFS, type ArchiveQualityFilterParams } from "@/lib/catalog/archive-quality-metrics";
import { formatArchiveTotalDuration, formatArchiveTotalSize } from "@/lib/shared/format";
import { pluralRu } from "@/lib/shared/russian-plural";

export function CatalogOverview({
  count, releaseCount, metrics, totals, filters, onFilter,
}: {
  count: number;
  releaseCount: number;
  metrics: ArchiveMetrics;
  totals: ArchiveTotals;
  filters: ArchiveQualityFilterParams;
  onFilter: (updates: Record<string, string | null>) => void;
}) {
  return (
    <section className="collection-summary" aria-label="Коллекция и её качество">
      <div className="collection-overview">
        <h1>Моя коллекция</h1>
        <div className="collection-counts">
          <strong>{count}</strong>
          <span>{pluralRu(count, "фильм", "фильма", "фильмов")}<span>{releaseCount} {pluralRu(releaseCount, "релиз", "релиза", "релизов")}</span></span>
        </div>
        <div className="collection-volume">
          <span title="Объём файлов каталога"><HardDrive aria-hidden /><b>{formatArchiveTotalSize(totals.fileSizeBytes) ?? "0 Б"}</b></span>
          <span title="Суммарный хронометраж каталога"><Clock aria-hidden /><b>{formatArchiveTotalDuration(totals.durationSeconds) ?? "0 ч"}</b></span>
        </div>
      </div>
      <div className="quality-showcase" aria-label="Доля фильмов в коллекции по качеству">
        {ARCHIVE_QUALITY_METRIC_DEFS.map((def) => {
          const Icon = def.icon;
          const value = metrics[def.key];
          const fraction = count > 0 ? value / count : 0;
          const active = def.isActive(filters, true);
          const label = def.shortLabel ?? def.label;
          return (
            <button
              key={def.key}
              type="button"
              className="quality-tile focus-ring"
              data-preset={def.key}
              aria-pressed={active}
              aria-label={`${label}: ${value} из ${count} фильмов. ${active ? "Снять отбор" : "Отфильтровать"}`}
              onClick={() => onFilter(def.toggleFilter(active))}
            >
              <span className="quality-tile-heading"><span>{label}</span><Icon aria-hidden /></span>
              <span className="quality-tile-readout"><strong>{value}</strong><span className="quality-tile-description">{pluralRu(value, "фильм", "фильма", "фильмов")}<span>{def.caption}</span></span></span>
              <span className="quality-tile-scale">
                <span className="quality-ticks" aria-hidden>{Array.from({ length: 32 }, (_, i) => <span key={i} className={i < Math.round(fraction * 32) ? "lit" : undefined} />)}</span>
                <span className="quality-share" title="Доля от всей коллекции">{Math.round(fraction * 100)}<small>%</small></span>
              </span>
              <span className="tile-hint" aria-hidden>{active ? "Снять отбор" : "Показать фильмы"}<ChevronRight /></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
