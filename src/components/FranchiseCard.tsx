import type { ReactNode } from "react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import Link from "next/link";
import { Clapperboard, Star } from "lucide-react";
import type { FranchiseWithSlots } from "@/lib/franchise-include";
import { franchiseCoverUrlFromFranchise } from "@/lib/franchise-cover-url";
import { computeFranchiseSummary } from "@/lib/franchise-summary";
import { pluralRu } from "@/lib/russian-plural";
import { FranchiseQualityReel } from "./FranchiseQualityReel";

interface FranchiseCardProps {
  franchise: FranchiseWithSlots;
  index?: number;
}

function eraLabel(start: number | null, end: number | null): string | null {
  if (start == null && end == null) return null;
  if (start == null) return `${end}`;
  if (end == null) return `${start}`;
  if (start === end) return `${start}`;
  return `${start}\u2013${end}`;
}

function Stat({
  label,
  value,
  icon,
  extra,
  title,
}: {
  label: string;
  value: string | null;
  icon?: ReactNode;
  extra?: ReactNode;
  title?: string;
}) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0" title={title}>
      <span className="font-mono-tech block text-[0.6rem] text-faint">
        {label}
      </span>
      <span className="mt-1 flex min-w-0 items-center gap-1 text-sm font-medium tabular-nums text-text">
        {icon}
        <span className="truncate">{value ?? "—"}</span>
        {extra}
      </span>
    </div>
  );
}

export function FranchiseCard({ franchise, index = 0 }: FranchiseCardProps) {
  const coverUrl = franchiseCoverUrlFromFranchise(franchise);
  const summary = computeFranchiseSummary(franchise);
  const era = eraLabel(summary.yearStart, summary.yearEnd);
  const rating =
    summary.averageRating != null ? summary.averageRating.toFixed(1) : null;

  return (
    <Link
      href={`/franchises/${franchise.slug}`}
      className="focus-ring group block rounded-[var(--radius)]"
      style={{
        animation: `movieCardIn 0.45s var(--ease) ${index * 40}ms both`,
      }}
    >
      <article className="surface-card overflow-hidden transition-all duration-200 group-hover:border-accent/40 group-hover:shadow-[0_0_28px_var(--accent-glow)]">
        <div className="relative aspect-[16/9] overflow-hidden bg-bg-elevated">
          {coverUrl ? (
            <ApiCoverImage
              src={coverUrl}
              alt={`Обложка: ${franchise.name}`}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading={index < 2 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft to-transparent">
              <Clapperboard className="h-12 w-12 text-accent/40" aria-hidden />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-mono-tech text-[0.65rem] text-accent">
                {summary.total} {pluralRu(summary.total, "фильм", "фильма", "фильмов")}
              </p>
              <h3 className="font-display mt-0.5 line-clamp-2 text-xl font-bold text-text">
                {franchise.name}
              </h3>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-2xl font-bold leading-none tabular-nums text-text">
                {summary.filled}
                <span className="font-mono-tech text-base font-normal text-faint">
                  {" / "}
                  {summary.total}
                </span>
              </div>
              <span className="font-mono-tech mt-1 block text-[0.6rem] text-muted">
                собрано
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 p-4">
          {summary.total > 0 ? (
            <FranchiseQualityReel slots={summary.slots} className="h-14" />
          ) : (
            <div className="h-14" aria-hidden />
          )}

          <div className="grid grid-cols-2 divide-x divide-border border-t border-border pt-3">
            <Stat label="годы" value={era} />
            <Stat
              label="ср. оценка"
              value={rating}
              title={
                summary.ratedCount > 0
                  ? `Средняя оценка ${rating} по ${summary.ratedCount} ${pluralRu(summary.ratedCount, "фильму", "фильмам", "фильмам")}`
                  : "Нет оценённых фильмов"
              }
              icon={
                <Star
                  className="h-3 w-3 shrink-0 fill-accent text-accent"
                  aria-hidden
                />
              }
              extra={
                summary.ratedCount > 0 ? (
                  <span className="font-mono-tech shrink-0 text-[0.6rem] text-faint">
                    · {summary.ratedCount}{" "}
                    {pluralRu(summary.ratedCount, "фильм", "фильма", "фильмов")}
                  </span>
                ) : null
              }
            />
          </div>
        </div>
      </article>
    </Link>
  );
}
