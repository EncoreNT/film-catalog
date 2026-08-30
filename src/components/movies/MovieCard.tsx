"use client";

import Link from "next/link";
import { AudioLines, Clapperboard, Layers, Star } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import {
  computeAverageRating,
  formatRatingDisplay,
} from "@/lib/movies/movie-rating";
import { formatDuration } from "@/lib/shared/format";
import { formatBitrateKbps } from "@/lib/shared/resolution";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { displayGenreName, remakeRoleLabel } from "@/lib/shared/dictionaries";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { HoverTooltip } from "@/components/primitives/HoverTooltip";
import { MovieReleasesTooltip } from "@/components/movies/MovieReleasesTooltip";
import { MovieRemakesTooltip } from "@/components/movies/MovieRemakesTooltip";
import { RemakeRoleMark } from "@/components/remakes/RemakeRoleMark";
import { LaserCardFrame } from "@/components/primitives/LaserCardFrame";
import {
  catalogCardTech,
  catalogAudioChipLabel,
  catalogHdrBadgeLabel,
  catalogTierRibbon,
  catalogTierRibbonCompact,
  releaseTier,
} from "@/lib/media/spec-tags";
import { isTvReadyRelease } from "@/lib/media/tv-ready";
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
  catalogDisplayDurationSeconds,
  formatSeriesCountLabel,
  shouldShowCatalogReleaseCountBadge,
} from "@/lib/movies/multipart-duration";
import type { CatalogRemakeBadge } from "@/lib/remakes/remake-catalog-badges";
import {
  tierCardGlow,
  tierChipTone,
  tierPosterGlow,
} from "@/lib/media/tier-presentation";
import { CoverPlaceholderBackdrop } from "@/components/shared/CoverPlaceholderBackdrop";
import { ExternalStorageMark } from "@/components/shared/ExternalStorageMark";
import { SpecTag } from "@/components/shared/SpecTag";
import { TierChip } from "@/components/shared/TierChip";
import { TvReadyMark } from "@/components/shared/TvReadyMark";
import { TierCoverOverlay } from "@/components/shared/TierCoverOverlay";
import {
  TooltipListHeader,
  TooltipListItem,
  TooltipListPanel,
} from "@/components/primitives/TooltipListParts";

interface MovieCardProps {
  movie: MovieWithTracks;
  index?: number;
  remakeBadge?: CatalogRemakeBadge;
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

type MovieCardRatedRow = MovieWithTracks["movieRatings"][number];

function MovieCardRatingBadges({ ratings }: { ratings: MovieCardRatedRow[] }) {
  const ratedRows = ratings.filter((row) => row.rater?.name);
  if (ratedRows.length === 0) return null;

  const badgeShell =
    "font-mono-tech inline-flex max-w-full items-center gap-1 rounded-full border bg-bg-deep/90 tabular-nums";

  if (ratedRows.length === 1) {
    const row = ratedRows[0]!;
    return (
      <span
        className={`${badgeShell} border-accent/50 px-2 py-[3px] text-[0.62rem] font-semibold text-accent-bright`}
        title={`${row.rater.name}: ${row.rating}/10`}
        aria-label={`${row.rater.name}: ${row.rating} из 10`}
      >
        <span className="max-w-[3.25rem] truncate text-[0.55rem] font-normal text-muted">
          {row.rater.name}
        </span>
        {row.rating}
        <Star className="h-2.5 w-2.5 shrink-0 fill-accent text-accent" aria-hidden />
      </span>
    );
  }

  const average = computeAverageRating(ratedRows);
  const overflow = ratedRows.slice(2);

  return (
    <div className="flex flex-col items-end gap-0.5">
      {average != null ? (
        <span
          className={`${badgeShell} border-accent/50 px-2 py-[3px] text-[0.62rem] font-semibold text-accent-bright`}
          title={`Средняя оценка ${formatRatingDisplay(average)} из 10`}
          aria-label={`Средняя оценка ${formatRatingDisplay(average)} из 10`}
        >
          {formatRatingDisplay(average)}
          <Star className="h-2.5 w-2.5 shrink-0 fill-accent text-accent" aria-hidden />
        </span>
      ) : null}
      {ratedRows.slice(0, 2).map((row) => (
        <span
          key={row.id}
          className={`${badgeShell} border-accent/40 px-1.5 py-[2px] text-[0.55rem] text-muted`}
          title={`${row.rater.name}: ${row.rating}/10`}
          aria-label={`${row.rater.name}: ${row.rating} из 10`}
        >
          <span className="max-w-[3.25rem] truncate">{row.rater.name}</span>
          <span className="shrink-0 font-semibold text-accent-bright">{row.rating}</span>
        </span>
      ))}
      {overflow.length > 0 ? (
        <HoverTooltip
          content={
            <ul className="space-y-1 text-xs">
              {ratedRows.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span className="text-muted">{row.rater.name}</span>
                  <span className="font-mono tabular-nums text-accent-bright">
                    {row.rating}/10
                  </span>
                </li>
              ))}
              {average != null ? (
                <li className="border-t border-border/60 pt-1 text-muted">
                  средняя{" "}
                  <span className="font-mono text-accent-bright">
                    {formatRatingDisplay(average)}
                  </span>
                </li>
              ) : null}
            </ul>
          }
        >
          <span
            className={`${badgeShell} cursor-default border-border-strong px-1.5 py-[2px] text-[0.55rem] text-muted`}
          >
            +{overflow.length}
          </span>
        </HoverTooltip>
      ) : null}
    </div>
  );
}

export function MovieCard({ movie, index = 0, remakeBadge }: MovieCardProps) {
  const primary = pickPrimaryRelease(movie.releases, movie.primaryReleaseId);
  const primaryId = primary?.id ?? null;
  const coverUrl = movieCoverUrlFromMovie(movie);
  const tier = primary ? releaseTier(primary) : null;
  const tech = primary ? catalogCardTech(primary) : null;
  const tierRibbon = primary ? catalogTierRibbon(tier, primary) : catalogTierRibbon(tier);
  const tierRibbonCompact = primary
    ? catalogTierRibbonCompact(tier, primary)
    : catalogTierRibbonCompact(tier);
  const chipTone = tierChipTone(tier);
  const tvReady = primary ? isTvReadyRelease(primary) : false;

  const hdrBadge = primary ? catalogHdrBadgeLabel(primary) : null;
  const hdrChip = hdrBadge != null ? { short: hdrBadge, full: hdrBadge } : null;

  // Audio chip label = spatial profile or codec + channels (e.g. "DTS:X 7.1", "TrueHD 7.1").
  const audioChipLabel = primary ? catalogAudioChipLabel(primary) : null;

  const duration = formatDuration(
    catalogDisplayDurationSeconds(
      movie.releases,
      movie.partCount,
      movie.primaryReleaseId,
    ),
  );
  const seriesLabel =
    movie.partCount != null && movie.partCount > 1
      ? formatSeriesCountLabel(movie.partCount)
      : null;
  const genres = orderedMovieGenres(movie).slice(0, 2);
  const releaseCount = movie.releases.length;
  const showReleaseCountBadge = shouldShowCatalogReleaseCountBadge(
    releaseCount,
    movie.partCount,
    movie.releases,
  );
  const hasExternal = movieHasExternalStorage(movie.releases);
  const externalStorageNames = movieExternalStorageNames(movie.releases);
  const hasFile = movieHasFile(movie.releases);
  const releaseCountLabel = `${releaseCount} ${pluralRu(
    releaseCount,
    "релиз",
    "релиза",
    "релизов",
  )}`;
  const hasRemakeLink =
    remakeBadge != null && remakeBadge.coMembers.length > 0;
  const remakeLinkAria =
    hasRemakeLink && remakeBadge
      ? `${remakeRoleLabel(remakeBadge.role) ?? "Версия"}. ${remakeBadge.coMembers.length} ${pluralRu(
          remakeBadge.coMembers.length,
          "связанная версия",
          "связанные версии",
          "связанных версий",
        )}. Наведите для списка.`
      : undefined;

  const ratedRows = movie.movieRatings.filter((row) => row.rater?.name);
  const hasTopRightMeta =
    ratedRows.length > 0 || showReleaseCountBadge || seriesLabel != null;
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

            {/* Top row — tier ribbon (left, truncates) + ratings/meta (right column).
                Ruby ribbon uses compact label on card; full text in title. */}
            <div className="absolute inset-x-0 top-0 z-10 p-2.5">
              <div className="flex items-start gap-1.5">
                {tierRibbon != null ? (
                  <div className="min-w-0 flex-1">
                    <TierChip
                      tone={chipTone}
                      size="xs"
                      truncate
                      title={tierRibbon}
                    >
                      {tierRibbonCompact ?? tierRibbon}
                    </TierChip>
                  </div>
                ) : (
                  <span className="min-w-0 flex-1" />
                )}

                {hasTopRightMeta ? (
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {seriesLabel ? (
                      <span
                        className="font-mono-tech inline-flex items-center gap-1 rounded-full border border-ember/45 bg-bg-deep/90 px-2 py-[2px] text-[0.55rem] tabular-nums text-ember-bright"
                        title={seriesLabel}
                        aria-label={seriesLabel}
                      >
                        <Clapperboard className="h-2.5 w-2.5" aria-hidden />
                        {movie.partCount}
                        <span className="text-[0.5rem] uppercase tracking-wide opacity-90">
                          сер.
                        </span>
                      </span>
                    ) : null}
                    <MovieCardRatingBadges ratings={movie.movieRatings} />
                    {showReleaseCountBadge ? (
                      <HoverTooltip
                        interactive
                        content={
                          <MovieReleasesTooltip
                            releases={sortReleasesByQuality(movie.releases)}
                            movieSlug={movie.slug}
                            movieId={movie.id}
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
            </div>

            {/* Bottom overlay — spec chips, then title (2-line reserve),
                then meta. Fixed block order reduces height jumping. */}
            <div className="absolute inset-x-0 bottom-0 z-10 p-2.5 pt-5">
              {releaseCount === 0 ? (
                <p className="font-mono-tech text-[0.55rem] uppercase tracking-[0.12em] text-muted">
                  нет релизов
                </p>
              ) : tech != null || hdrChip != null ? (
                <div className="flex flex-wrap items-center gap-1">
                  {tech?.releaseType ? (
                    <SpecTag variant="chip" tone={chipTone} size="xs">
                      {tech.releaseType}
                    </SpecTag>
                  ) : null}
                  {tech?.resolution && tier == null ? (
                    <SpecTag variant="chip" tone={chipTone} size="xs">
                      {tech.resolution}
                    </SpecTag>
                  ) : null}
                  {hdrChip ? (
                    <SpecTag
                      variant="chip"
                      tone={chipTone}
                      size="xs"
                      title={hdrChip.full}
                    >
                      {hdrChip.short}
                    </SpecTag>
                  ) : null}
                  {audioChipLabel && primary ? (
                    <HoverTooltip
                      interactive
                      content={<AudioTracksPopover release={primary} />}
                    >
                      <SpecTag
                        variant="chip"
                        tone={chipTone}
                        size="xs"
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
                      </SpecTag>
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

              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 font-mono-tech text-[0.55rem]">
                {genres.length > 0 ? (
                  <span
                    className="min-w-0 flex-1 truncate text-muted"
                    title={genres
                      .map((g) => displayGenreName(g.name))
                      .join(", ")}
                  >
                    {genres.map((g) => displayGenreName(g.name)).join(" · ")}
                  </span>
                ) : (
                  <span className="min-w-0 flex-1 text-faint">Без жанра</span>
                )}
                <div className="flex shrink-0 items-center gap-1.5">
                  {hasExternal ? (
                    <ExternalStorageMark storageNames={externalStorageNames} />
                  ) : null}
                  {tvReady ? <TvReadyMark /> : null}
                  {hasRemakeLink && remakeBadge ? (
                    <HoverTooltip
                      interactive
                      content={
                        <MovieRemakesTooltip
                          role={remakeBadge.role}
                          coMembers={remakeBadge.coMembers}
                        />
                      }
                    >
                      <span
                        className="inline-flex shrink-0"
                        aria-label={remakeLinkAria}
                      >
                        <RemakeRoleMark role={remakeBadge.role} ariaHidden />
                      </span>
                    </HoverTooltip>
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
                </div>
                {duration ? (
                  <span
                    className="shrink-0 tabular-nums text-accent/80"
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
