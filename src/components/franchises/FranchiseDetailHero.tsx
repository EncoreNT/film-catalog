import Link from "next/link";
import { Clapperboard, Pencil } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { BackLink } from "@/components/primitives/BackLink";
import { FranchiseCompletionMeter } from "@/components/franchises/FranchiseCompletionMeter";
import { QualityGauge } from "@/components/primitives/QualityGauge";
import { ARCHIVE_QUALITY_METRIC_DEFS } from "@/lib/catalog/archive-quality-metrics";
import { pluralRu } from "@/lib/shared/russian-plural";
import type { ArchiveMetrics } from "@/lib/catalog/archive-metrics";

interface FranchiseDetailHeroProps {
  franchise: {
    slug: string;
    name: string;
    description: string | null;
  };
  coverUrl: string | null;
  filled: number;
  total: number;
  metrics: ArchiveMetrics;
}

export function FranchiseDetailHero({
  franchise,
  coverUrl,
  filled,
  total,
  metrics,
}: FranchiseDetailHeroProps) {
  return (
    <section className="relative left-1/2 -translate-x-1/2 -mt-8 sm:-mt-12 w-screen overflow-hidden border-b border-border bg-bg-elevated">
      <div className="relative w-full aspect-[16/9] min-h-[300px] max-h-[680px]">
        {coverUrl ? (
          <ApiCoverImage
            src={coverUrl}
            alt={`Обложка: ${franchise.name}`}
            fill
            sizes="100vw"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft to-transparent">
            <Clapperboard className="h-16 w-16 text-accent/30" aria-hidden />
          </div>
        )}
        <div
          className="pointer-events-none absolute inset-0 bg-bg-deep/30"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-deep via-bg-deep/85 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-bg-deep/80 to-transparent"
          aria-hidden
        />

        <div className="absolute inset-x-0 top-0">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 sm:px-8 pt-6">
            <BackLink
              href="/franchises"
              className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] bg-bg-deep/50 px-3 py-1.5 text-sm text-text/90 backdrop-blur-sm transition-colors hover:bg-bg-deep/70 hover:text-accent"
            >
              К списку франшиз
            </BackLink>
            <Link
              href={`/franchises/${franchise.slug}/edit`}
              className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] border border-white/15 bg-bg-deep/50 px-3.5 py-1.5 text-sm font-medium text-text backdrop-blur-sm transition-all duration-200 hover:border-accent/50 hover:text-accent"
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Редактировать
            </Link>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 pb-8 sm:pb-10 pt-6">
            <div className="max-w-3xl space-y-4">
              <div>
                <p className="font-mono-tech text-accent">
                  {total}{" "}
                  {pluralRu(total, "фильм", "фильма", "фильмов")}
                </p>
                <h1 className="font-display mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
                  {franchise.name}
                </h1>
                {franchise.description ? (
                  <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-relaxed text-text/80">
                    {franchise.description}
                  </p>
                ) : null}
              </div>

              {total > 0 ? (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono-tech shrink-0 text-[0.6rem] uppercase tracking-wider text-text/70">
                      собрано
                    </span>
                    <FranchiseCompletionMeter
                      filled={filled}
                      total={total}
                      variant="inline"
                      className="min-w-0 flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ARCHIVE_QUALITY_METRIC_DEFS.map((def) => {
                      const Icon = def.icon;
                      return (
                        <QualityGauge
                          key={def.key}
                          count={metrics[def.key]}
                          total={total}
                          label={def.label}
                          icon={<Icon className="h-3.5 w-3.5" />}
                          elite={def.elite}
                          interactive={false}
                          size="sm"
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
