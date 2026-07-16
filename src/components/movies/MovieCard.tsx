"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { AudioLines, Layers, Star } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { formatDuration } from "@/lib/shared/format";
import { formatBitrateKbps } from "@/lib/shared/resolution";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { displayGenreName } from "@/lib/shared/dictionaries";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { MovieReleasesTooltip } from "@/components/movies/MovieReleasesTooltip";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import {
  catalogCardTech,
  catalogTierRibbon,
  premiumHdrView,
  releaseTier,
} from "@/lib/media/spec-tags";
import { formatAudioLabel, translationShort } from "@/lib/media/audio-labels";
import {
  movieExternalStorageNames,
  movieHasExternalStorage,
  movieHasFile,
  pickPrimaryRelease,
  sortReleasesByQuality,
} from "@/lib/releases/release-primary";
import { pluralRu } from "@/lib/shared/russian-plural";
import {
  tierCardGlow,
  tierChipTone,
  tierPosterGlow,
  type TierChipTone,
} from "@/lib/media/tier-presentation";
import { CoverPlaceholderBackdrop } from "@/components/shared/CoverPlaceholderBackdrop";
import { ExternalStorageMark } from "@/components/shared/ExternalStorageMark";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
import {
  TooltipListHeader,
  TooltipListItem,
  TooltipListPanel,
} from "@/components/primitives/TooltipListParts";

interface MovieCardProps {
  movie: MovieWithTracks;
  index?: number;
}

/** Compact HDR label so the tier pill never overflows. */
function shortHdrLabel(label: string): string {
  if (label.startsWith("Dolby Vision")) return "DV";
  return label; // HDR10, HDR10+, HLG
}

const CHIP_TONE: Record<TierChipTone, { base: string; hover: string }> = {
  default: {
    base: "border-border-strong text-text/85",
    hover: "hover:border-text/40",
  },
  gold: {
    base: "border-accent/45 text-accent-bright",
    hover: "hover:border-accent/75",
  },
  ruby: {
    base: "border-crimson/45 text-crimson-bright",
    hover: "hover:border-crimson/80",
  },
};

/**
 * Compact content-hugging spec chip — the single badge language for card
 * metadata. Hugs its content (no `w-full` stretch), tier-aware tone, optional
 * icon. The audio chip passes `interactive` to brighten its border on hover
 * and signal the popover that opens over it.
 */
function SpecChip({
  children,
  tone = "default",
  icon,
  interactive = false,
  className = "",
  title,
}: {
  children: ReactNode;
  tone?: TierChipTone;
  icon?: ReactNode;
  interactive?: boolean;
  className?: string;
  title?: string;
}) {
  const t = CHIP_TONE[tone];
  return (
    <span
      className={`font-mono-tech inline-flex items-center gap-1 rounded-full border bg-bg-deep/90 px-2 py-[3px] text-[0.55rem] font-semibold uppercase tracking-[0.14em] whitespace-nowrap transition-colors duration-200 ${t.base} ${interactive ? `${t.hover} cursor-help` : ""} ${className}`}
      title={title}
    >
      {icon}
      {children}
    </span>
  );
}

/**
 * Rich audio detail popover — lists every audio track of the primary
 * release with codec/profile, channels, language, translation and bitrate.
 * The main (`isDefault`) track is highlighted with a gold inset ring so the
 * chip label and the popover always agree on which track is "the" audio.
 * Reuses the same `formatAudioLabel` / `translationShort` formatters as the
 * rest of the app — single source of truth for audio labels.
 */
function AudioTracksPopover({ release }: { release: ReleaseWithTracks }) {
  const tracks = [...release.audioTracks].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.streamIndex - b.streamIndex;
  });

  if (tracks.length === 0) {
    return (
      <div className="p-2.5">
        <p className="font-mono-tech text-[0.6rem] uppercase tracking-wider text-faint">
          Аудиодорожек нет
        </p>
      </div>
    );
  }

  return (
    <TooltipListPanel widthClass="w-[min(20rem,calc(100vw-2rem))]">
      <TooltipListHeader label="аудиодорожки" count={tracks.length} />
      <ul className="space-y-0.5">
        {tracks.map((track) => {
          const label = formatAudioLabel(track) ?? "Аудио";
          const channels =
            track.channelLayout && track.channelLayout !== "other"
              ? track.channelLayout
              : null;
          const lang = track.language ? track.language.toUpperCase() : null;
          const translation = translationShort(track.translationType);
          const bitrate = formatBitrateKbps(track.bitrate);
          const isMain = track.isDefault;
          return (
            <TooltipListItem key={track.id} highlighted={isMain}>
              <span className="flex items-center justify-between gap-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {isMain ? (
                    <Star
                      className="h-3.5 w-3.5 shrink-0 fill-accent text-accent"
                      aria-hidden
                    />
                  ) : (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-border-strong"
                      aria-hidden
                    />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text">
                      {label}
                    </span>
                    <span className="font-mono-tech mt-0.5 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[0.6rem] text-faint">
                      {channels ? <span>{channels}</span> : null}
                      {lang ? <span>{lang}</span> : null}
                      {translation ? <span>{translation}</span> : null}
                    </span>
                  </span>
                </span>
                {bitrate ? (
                  <span className="font-mono-tech shrink-0 text-[0.6rem] tabular-nums text-faint">
                    {bitrate}
                  </span>
                ) : null}
              </span>
            </TooltipListItem>
          );
        })}
      </ul>
    </TooltipListPanel>
  );
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const primary = pickPrimaryRelease(movie.releases);
  const primaryId = primary?.id ?? null;
  const coverUrl = movieCoverUrlFromMovie(movie);
  const premiumHdr = primary ? premiumHdrView(primary) : null;
  const tier = primary ? releaseTier(primary) : null;
  const tech = primary ? catalogCardTech(primary) : null;
  const tierRibbon = catalogTierRibbon(tier);
  const chipTone = tierChipTone(tier);

  const hdrChip =
    premiumHdr != null
      ? { short: shortHdrLabel(premiumHdr.label), full: premiumHdr.label }
      : null;

  // Audio chip label = codec + channels (e.g. "TrueHD 7.1", "AC3 5.1").
  // The chip opens AudioTracksPopover with every track of the release.
  const audioChipLabel =
    tech != null
      ? [tech.audioCodecShort, tech.channels].filter(Boolean).join(" ") || null
      : null;

  const duration = formatDuration(primary?.durationSeconds ?? null);
  const genres = orderedMovieGenres(movie).slice(0, 2);
  const releaseCount = movie.releases.length;
  const hasExternal = movieHasExternalStorage(movie.releases);
  const externalStorageNames = movieExternalStorageNames(movie.releases);
  const hasFile = movieHasFile(movie.releases);
  const releaseCountLabel = `${releaseCount} ${pluralRu(
    releaseCount,
    "релиз",
    "релиза",
    "релизов",
  )}`;

  const cardGlow = tierCardGlow(tier);

  return (
    <article
      className={`group relative rounded-[var(--radius)] ${cardGlow} transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:z-10 hover:-translate-y-1 hover:scale-[1.03]`}
    >
      <Link href={`/movies/${movie.slug}`} className="focus-ring block">
        <LaserCardFrame tier={tier}>
          <div
            className={`relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] bg-bg-base transition-shadow duration-500 ${tierPosterGlow(tier)}`}
          >
            {coverUrl ? (
              <ApiCoverImage
                src={coverUrl}
                alt={`Обложка: ${movie.title}`}
                fill
                sizes="(max-width:1024px) 33vw, (max-width:1280px) 25vw, (max-width:1536px) 20vw, (max-width:1920px) 17vw, 15vw"
                className="object-cover transition-transform duration-700 group-hover/laser:scale-[1.06]"
                style={{ transitionTimingFunction: "var(--ease)" }}
                loading={index < 8 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : undefined}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <CoverPlaceholderBackdrop />
                <p className="font-display relative text-lg font-bold leading-tight text-text sm:text-xl">
                  {movie.title}
                </p>
                {movie.year ? (
                  <p className="font-mono-tech relative mt-2 text-accent/80">
                    {movie.year}
                  </p>
                ) : null}
              </div>
            )}

            <TierCoverOverlay tier={tier} />

            {/* Top row — tier ribbon (left) + rating/releases (right).
                Ribbon: 4K | HDR (gold) or 4K | HDR | РУС. ATMOS (ruby).
                Regular cards have no ribbon — that absence is the signal. */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 p-2.5">
              {tierRibbon != null ? (
                <SpecChip tone={chipTone}>{tierRibbon}</SpecChip>
              ) : (
                <span />
              )}

              {movie.rating != null || releaseCount > 1 ? (
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {movie.rating != null ? (
                    <span
                      className="font-mono-tech inline-flex items-center gap-1 rounded-full border border-accent/50 bg-bg-deep/90 px-2 py-[3px] text-[0.62rem] font-semibold tabular-nums text-accent-bright"
                      aria-label={`Оценка ${movie.rating} из 10`}
                      title={`Оценка ${movie.rating} из 10`}
                    >
                      {movie.rating}
                      <Star
                        className="h-2.5 w-2.5 fill-accent text-accent"
                        aria-hidden
                      />
                    </span>
                  ) : null}
                  {releaseCount > 1 ? (
                    <HoverTooltip
                      interactive
                      content={
                        <MovieReleasesTooltip
                          releases={sortReleasesByQuality(movie.releases)}
                          movieSlug={movie.slug}
                          primaryReleaseId={primaryId}
                        />
                      }
                    >
                      <span
                        className="font-mono-tech inline-flex cursor-pointer items-center gap-1 rounded-full border border-ember/45 bg-bg-deep/90 px-2 py-[2px] text-[0.55rem] tabular-nums text-ember-bright transition-colors duration-200 group-hover/laser:border-ember/70"
                        title={`${releaseCountLabel} у фильма`}
                        aria-label={`${releaseCountLabel} у фильма. Наведите для списка.`}
                      >
                        <Layers className="h-2.5 w-2.5" aria-hidden />
                        {releaseCount}
                      </span>
                    </HoverTooltip>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Bottom overlay — spec chips, then title (2-line reserve),
                then meta. Fixed block order reduces height jumping. */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 pt-5">
              {tech != null || hdrChip != null ? (
                <div className="flex flex-wrap items-center gap-1">
                  {tech?.releaseType ? (
                    <SpecChip tone={chipTone}>{tech.releaseType}</SpecChip>
                  ) : null}
                  {tech?.resolution && tier == null ? (
                    <SpecChip tone={chipTone}>{tech.resolution}</SpecChip>
                  ) : null}
                  {hdrChip ? (
                    <SpecChip tone={chipTone} title={hdrChip.full}>
                      {hdrChip.short}
                    </SpecChip>
                  ) : null}
                  {audioChipLabel && primary ? (
                    <HoverTooltip
                      interactive
                      content={<AudioTracksPopover release={primary} />}
                    >
                      <SpecChip
                        tone={chipTone}
                        interactive
                        icon={
                          <AudioLines
                            className="h-2.5 w-2.5 shrink-0"
                            aria-hidden
                          />
                        }
                        title="Все аудиодорожки релиза: наведите для списка"
                      >
                        {audioChipLabel}
                      </SpecChip>
                    </HoverTooltip>
                  ) : null}
                </div>
              ) : null}

              <h3
                className="font-display mt-1.5 line-clamp-2 min-h-[2.65rem] text-[0.92rem] font-semibold leading-snug tracking-tight text-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)] sm:min-h-[2.75rem] sm:text-[0.98rem]"
                title={movie.title}
              >
                {movie.title}
              </h3>

              <div className="mt-1.5 flex items-center gap-2 font-mono-tech text-[0.55rem]">
                {genres.length > 0 ? (
                  <span
                    className="truncate text-muted"
                    title={genres
                      .map((g) => displayGenreName(g.name))
                      .join(", ")}
                  >
                    {genres.map((g) => displayGenreName(g.name)).join(" · ")}
                  </span>
                ) : (
                  <span className="text-faint">Без жанра</span>
                )}
                {hasExternal ? (
                  <ExternalStorageMark storageNames={externalStorageNames} />
                ) : null}
                {!hasFile ? (
                  <span
                    className="shrink-0 text-faint"
                    title="Файл не указан"
                    aria-label="Файл не указан"
                  >
                    ◌
                  </span>
                ) : null}
                {duration ? (
                  <span
                    className="ml-auto shrink-0 tabular-nums text-accent/80"
                    title="Длительность"
                  >
                    {duration}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </LaserCardFrame>
      </Link>
    </article>
  );
}
