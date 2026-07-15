import Link from "next/link";
import { Clapperboard, Star } from "lucide-react";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import { franchiseCoverUrlFromFranchise } from "@/lib/covers/franchise-cover-url";
import { computeFranchiseSummary } from "@/lib/franchises/franchise-summary";
import { pluralRu } from "@/lib/shared/russian-plural";
import { formatArchiveTotalDuration } from "@/lib/shared/format";
import { FranchiseQualityReel } from "@/components/franchises/FranchiseQualityReel";

interface FranchiseCardProps {
  franchise: FranchiseWithSlots;
  index?: number;
}

function eraLabel(start: number | null, end: number | null): string | null {
  if (start == null && end == null) return null;
  if (start == null) return `${end}`;
  if (end == null) return `${start}`;
  if (start === end) return `${start}`;
  return `${start}-${end}`;
}

/**
 * Cover-forward franchise tile for the list page. The 16:9 backdrop is the
 * hero asset (franchise covers are uploaded landscape); the title, film
 * count and rating live on the cover so the hierarchy reads at a glance.
 * Below sits a compact meta band: a slim tier film-strip (the per-slot
 * quality reel collapsed to ruby / gold / standard notches) and one muted
 * line of years / runtime. The franchise-level tier (every owned film is
 * ruby, or every owned film is gold+) drives the LaserCardFrame treatment:
 * ruby → crimson laser perimeter + holo-ruby, gold → warm-gold laser + holo,
 * matching the movie-card and release-tab tier language.
 */
export function FranchiseCard({ franchise, index = 0 }: FranchiseCardProps) {
  const coverUrl = franchiseCoverUrlFromFranchise(franchise);
  const summary = computeFranchiseSummary(franchise);
  const era = eraLabel(summary.yearStart, summary.yearEnd);
  const rating =
    summary.averageRating != null ? summary.averageRating.toFixed(1) : null;
  const runtime = formatArchiveTotalDuration(summary.totalRuntimeSeconds);
  const tier = summary.tier;
  const filmCount = `${summary.total} ${pluralRu(
    summary.total,
    "фильм",
    "фильма",
    "фильмов",
  )}`;
  const cardTitle = `Оценка ${rating} из 10 по ${summary.ratedCount} ${pluralRu(
    summary.ratedCount,
    "фильму",
    "фильмам",
    "фильмам",
  )}`;
  const ariaLabel = `${franchise.name}. ${filmCount}${
    rating != null ? `. Оценка ${rating} из 10` : ""
  }`;

  const cardGlow =
    tier === "ruby"
      ? "glow-card-ruby"
      : tier === "gold"
        ? "glow-card-gold"
        : "glow-card-rest";

  return (
    <article
      className={`group relative rounded-[var(--radius)] ${cardGlow} transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-1 hover:scale-[1.02] [backface-visibility:hidden] [transform:translateZ(0)]`}
    >
      <Link
        href={`/franchises/${franchise.slug}`}
        className="focus-ring block"
        aria-label={ariaLabel}
        style={{
          animation: `movieCardIn 0.45s var(--ease) ${index * 45}ms both`,
        }}
      >
        <LaserCardFrame tier={tier}>
          {/* Single elevated shell clips rounded corners; cover + meta share one
              opaque bg so scale/hover compositing never leaves a 1px wedge in
              the bottom radius. Meta overlaps cover via ::before bleed. */}
          <div
            className={`relative flex flex-col overflow-hidden rounded-[var(--radius)] bg-bg-elevated transition-shadow duration-500 ${
              tier === "ruby"
                ? "glow-poster-ruby-inset"
                : tier === "gold"
                  ? "glow-poster-gold-inset"
                  : "glow-poster-inset"
            }`}
          >
            {/* Cover zoom uses a bottom-anchored scale layer so the image grows
                upward into the frame, not away from the meta-band seam. */}
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-bg-base after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:z-[4] after:h-[3px] after:bg-bg-elevated after:content-['']">
              {coverUrl ? (
                <div
                  className="absolute inset-0 origin-bottom transition-transform duration-700 group-hover/laser:scale-[1.05] [backface-visibility:hidden]"
                  style={{ transitionTimingFunction: "var(--ease)" }}
                >
                  <ApiCoverImage
                    src={coverUrl}
                    alt={`Обложка: ${franchise.name}`}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, (max-width:1536px) 33vw, 25vw"
                    className="object-cover"
                    loading={index < 4 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : undefined}
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                  <div
                    className="absolute inset-0 opacity-60"
                    aria-hidden
                    style={{
                      background:
                        "radial-gradient(ellipse 80% 60% at 50% 30%, var(--accent-soft) 0%, transparent 70%)",
                    }}
                  />
                  <div
                    className="absolute inset-0 opacity-40"
                    aria-hidden
                    style={{
                      background:
                        "radial-gradient(ellipse 60% 50% at 50% 100%, var(--neural-soft) 0%, transparent 70%)",
                    }}
                  />
                  <Clapperboard
                    className="relative h-12 w-12 text-accent/45"
                    aria-hidden
                  />
                </div>
              )}

              {tier === "ruby" || tier === "gold" ? (
                <>
                  <div
                    className={`pointer-events-none absolute inset-0 z-[2] opacity-[0.12] mix-blend-overlay transition-opacity duration-500 group-hover/laser:opacity-50 ${
                      tier === "ruby" ? "holo-ruby" : "holo-gold"
                    }`}
                    aria-hidden
                  />
                  <div
                    className={`tier-laser-top ${
                      tier === "ruby"
                        ? "tier-laser-top-ruby"
                        : "tier-laser-top-gold"
                    }`}
                    aria-hidden
                  />
                </>
              ) : null}

              <div
                className="pointer-events-none absolute inset-0 z-[3]"
                aria-hidden
                style={{
                  background:
                    "linear-gradient(to top, rgba(7,6,10,0.96) 0%, rgba(7,6,10,0.82) 22%, rgba(7,6,10,0.4) 45%, transparent 65%)",
                }}
              />

              {rating != null ? (
                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-end p-2.5">
                  <span
                    className="font-mono-tech inline-flex items-center gap-1 rounded-full border border-accent/50 bg-bg-deep/90 px-2 py-[3px] text-[0.62rem] font-semibold tabular-nums text-accent-bright backdrop-blur-sm"
                    title={cardTitle}
                    aria-label={cardTitle}
                  >
                    {rating}
                    <Star
                      className="h-2.5 w-2.5 fill-accent text-accent"
                      aria-hidden
                    />
                  </span>
                </div>
              ) : null}

              <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                <p className="font-mono-tech text-[0.65rem] uppercase tracking-[0.14em] text-accent/90">
                  {filmCount}
                </p>
                <h3 className="font-display mt-1 line-clamp-2 text-xl font-bold leading-tight tracking-tight text-text sm:text-2xl">
                  {franchise.name}
                </h3>
              </div>
            </div>

            <div className="relative shrink-0 px-4 py-3 before:pointer-events-none before:absolute before:inset-x-0 before:-top-[3px] before:z-[1] before:h-[3px] before:bg-bg-elevated before:content-['']">
              <div className="relative space-y-2.5">
                {summary.total > 0 ? (
                  <FranchiseQualityReel slots={summary.slots} variant="slim" />
                ) : (
                  <div className="h-5" aria-hidden />
                )}
                <div className="flex items-center gap-3 font-mono-tech text-[0.65rem] tabular-nums text-muted">
                  {era ? (
                    <span className="text-text/80">{era}</span>
                  ) : (
                    <span className="text-faint">годы неизвестны</span>
                  )}
                  {runtime ? (
                    <span className="ml-auto flex items-center gap-3">
                      <span className="h-3 w-px bg-border" aria-hidden />
                      <span>{runtime}</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </LaserCardFrame>
      </Link>
    </article>
  );
}
