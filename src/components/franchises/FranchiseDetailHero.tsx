import { Clapperboard, Star } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { BackLink } from "@/components/primitives/BackLink";
import { EditEntityLink } from "@/components/primitives/EditEntityLink";
import { DetailMetaLine } from "@/components/primitives/DetailMetaLine";
import { FranchiseCompletionMeter } from "@/components/franchises/FranchiseCompletionMeter";
import { FranchiseQualityReel } from "@/components/franchises/FranchiseQualityReel";
import { pluralRu } from "@/lib/shared/russian-plural";
import { formatArchiveTotalDuration } from "@/lib/shared/format";
import type { FranchiseSummary } from "@/lib/franchises/franchise-summary";
import { tierPosterGlow } from "@/lib/media/tier-presentation";

interface FranchiseDetailHeroProps {
  franchise: {
    slug: string;
    name: string;
    description: string | null;
  };
  coverUrl: string | null;
  summary: FranchiseSummary;
}

function eraLabel(start: number | null, end: number | null): string | null {
  if (start == null && end == null) return null;
  if (start == null) return `${end}`;
  if (end == null) return `${start}`;
  if (start === end) return `${start}`;
  return `${start}-${end}`;
}

function MetaLine({ summary }: { summary: FranchiseSummary }) {
  const era = eraLabel(summary.yearStart, summary.yearEnd);
  const runtime = formatArchiveTotalDuration(summary.totalRuntimeSeconds);
  const rating =
    summary.averageRating != null ? summary.averageRating.toFixed(1) : null;

  return (
    <DetailMetaLine
      separator="pipe"
      className="text-[0.65rem] tabular-nums"
      items={[
        {
          key: "era",
          node: era ? (
            <span className="text-text/80">{era}</span>
          ) : (
            <span className="text-faint">годы неизвестны</span>
          ),
        },
        { key: "runtime", node: runtime ? <span>{runtime}</span> : null },
        {
          key: "rating",
          node: rating ? (
            <span className="inline-flex items-center gap-1 text-accent-bright">
              {rating}
              <Star className="h-2.5 w-2.5 fill-accent text-accent" aria-hidden />
            </span>
          ) : null,
        },
      ]}
    />
  );
}

/**
 * Pinned masthead — editorial split from the "Bond OK" composition.
 *
 * Cover stays true 16:9. Height is budgeted so the film-card row below still
 * fits on screen (`clamp` vs viewport); width follows aspect, and the left
 * column is `auto` (sized to the still) — never a full-bleed 16:9 that eats
 * half the viewport, and never a tiny still floating in a wide empty column.
 */
export function FranchiseDetailHero({
  franchise,
  coverUrl,
  summary,
}: FranchiseDetailHeroProps) {
  const tier = summary.tier;
  const tierGlow = tierPosterGlow(tier);
  const filmCount = `${summary.total} ${pluralRu(
    summary.total,
    "фильм",
    "фильма",
    "фильмов",
  )}`;
  const era = eraLabel(summary.yearStart, summary.yearEnd);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <BackLink href="/franchises">К списку франшиз</BackLink>
        <EditEntityLink
          href={`/franchises/${franchise.slug}/edit`}
          title="Редактировать франшизу"
          showIcon={false}
        />
      </div>

      {/* auto | 1fr — left column hugs the still, title takes the rest */}
      <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-7">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="group relative w-full lg:w-fit lg:max-w-full">
            <div className="poster-frame w-full lg:w-fit lg:max-w-full">
              {/*
                Height budget (desktop): ~240–288px → width follows 16:9
                (~427–512px). Mobile: full-width 16:9 from the column.
              */}
              <div
                className={`poster-frame-inner relative aspect-[16/9] w-full overflow-hidden bg-bg-base lg:h-[clamp(15rem,28dvh,18rem)] lg:w-auto lg:max-w-full ${tierGlow}`}
              >
                {coverUrl ? (
                  <ApiCoverImage
                    src={coverUrl}
                    alt={`Обложка: ${franchise.name}`}
                    fill
                    sizes="(max-width:1024px) 100vw, 30rem"
                    className="object-cover object-center transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04]"
                    loading="eager"
                    fetchPriority="high"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                    <div
                      className="absolute inset-0 opacity-60"
                      aria-hidden
                      style={{
                        background:
                          "radial-gradient(ellipse 80% 60% at 50% 30%, var(--accent-soft) 0%, transparent 70%)",
                      }}
                    />
                    <Clapperboard
                      className="relative h-10 w-10 text-accent/45"
                      aria-hidden
                    />
                  </div>
                )}

                {tier ? (
                  <div
                    className={`pointer-events-none absolute inset-0 z-[2] opacity-[0.12] mix-blend-overlay transition-opacity duration-500 group-hover:opacity-40 ${
                      tier === "ruby" ? "holo-ruby" : "holo-gold"
                    }`}
                    aria-hidden
                  />
                ) : null}

                {tier ? (
                  <div
                    className={`tier-laser-top ${
                      tier === "ruby"
                        ? "tier-laser-top-ruby"
                        : "tier-laser-top-gold"
                    }`}
                    aria-hidden
                  />
                ) : null}

                <div
                  className="pointer-events-none absolute inset-0 z-[3]"
                  aria-hidden
                  style={{
                    background:
                      "linear-gradient(to top, rgba(7,6,10,0.45) 0%, transparent 50%)",
                  }}
                />
              </div>
            </div>
          </div>

          {summary.total > 0 ? (
            <FranchiseQualityReel
              slots={summary.slots}
              variant="slim"
              className="w-full"
            />
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-3 lg:border-l lg:border-border lg:pl-7">
          <div className="space-y-1.5">
            <p className="font-mono-tech text-[0.65rem] uppercase tracking-[0.16em] text-accent/80">
              {filmCount}
              {era ? <span className="text-faint"> · {era}</span> : null}
            </p>
            <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight sm:text-4xl lg:text-[2.75rem]">
              {franchise.name}
            </h1>
          </div>

          {franchise.description ? (
            <p className="line-clamp-2 max-w-md text-sm leading-relaxed text-muted">
              {franchise.description}
            </p>
          ) : null}

          {summary.total > 0 ? (
            <div className="space-y-2.5 border-t border-border pt-3">
              <div className="flex items-center gap-3">
                <span className="font-mono-tech shrink-0 text-[0.55rem] uppercase tracking-[0.16em] text-faint">
                  собрано
                </span>
                <FranchiseCompletionMeter
                  filled={summary.filled}
                  total={summary.total}
                  variant="inline"
                  className="min-w-0 flex-1"
                />
              </div>
              <MetaLine summary={summary} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
