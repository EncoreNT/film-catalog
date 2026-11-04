"use client";

import Link from "next/link";
import { Clapperboard,Layers,Star } from "lucide-react";
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
import { displayGenreName,remakeRoleLabel } from "@/lib/shared/dictionaries";
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
  releaseTier,
} from "@/lib/media/spec-tags";
import { isTvReadyRelease } from "@/lib/media/tv-ready";
import { formatAudioLabel,translationShort } from "@/lib/media/audio-labels";
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
  const tracks=[...release.audioTracks].sort((a,b) => {
    if(a.isDefault&&!b.isDefault) return -1;
    if(!a.isDefault&&b.isDefault) return 1;
    return a.streamIndex-b.streamIndex;
  });

  if(tracks.length===0) {
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
          const label=formatAudioLabel(track)??"Аудио";
          const channels=
            track.channelLayout&&track.channelLayout!=="other"
              ? track.channelLayout
              :null;
          const lang=track.language? track.language.toUpperCase():null;
          const translation=translationShort(track.translationType);
          const bitrate=formatBitrateKbps(track.bitrate);
          const isMain=track.isDefault;
          return (
            <TooltipListItem key={track.id} highlighted={isMain}>
              <span className="flex items-center justify-between gap-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  {isMain? (
                    <Star
                      className="h-3.5 w-3.5 shrink-0 fill-accent text-accent"
                      aria-hidden
                    />
                  ):(
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
                      {channels? <span>{channels}</span>:null}
                      {lang? <span>{lang}</span>:null}
                      {translation? <span>{translation}</span>:null}
                    </span>
                  </span>
                </span>
                {bitrate? (
                  <span className="font-mono-tech shrink-0 text-[0.6rem] tabular-nums text-faint">
                    {bitrate}
                  </span>
                ):null}
              </span>
            </TooltipListItem>
          );
        })}
      </ul>
    </TooltipListPanel>
  );
}

type MovieCardRatedRow=MovieWithTracks["movieRatings"][number];

function MovieCardRatings({ ratings }: { ratings: MovieCardRatedRow[] }) {
  const ratedRows=ratings.filter((row) => row.rater?.name);
  const average=computeAverageRating(ratedRows);
  const overflow=ratedRows.slice(2);

  if(average==null) {
    return (
      <div className="movie-card-ratings movie-card-ratings--empty">
        <Star aria-hidden /><span>Нет оценок</span>
      </div>
    );
  }

  return (
    <div className="movie-card-ratings" aria-label="Оценки фильма">
      <span className="movie-card-score" title={`Средняя оценка: ${formatRatingDisplay(average)} из 10`}>
        <Star aria-hidden /><strong>{formatRatingDisplay(average)}</strong>
      </span>
      <div className="movie-card-raters">
        {ratedRows.slice(0,2).map((row) => (
          <span key={row.id} className="movie-card-rater" title={`${row.rater.name}: ${row.rating}/10`} aria-label={`${row.rater.name}: ${row.rating} из 10`}>
            <span>{row.rater.name}</span><strong>{row.rating}</strong>
          </span>
        ))}
      </div>
      {overflow.length>0? (
        <HoverTooltip content={
          <div className="p-3">
            <p className="mb-2 text-xs text-muted">Все оценки</p>
            <ul className="space-y-1 text-xs">
              {ratedRows.map((row) => <li key={row.id} className="flex justify-between gap-4"><span>{row.rater.name}</span><strong className="text-accent">{row.rating}/10</strong></li>)}
            </ul>
          </div>
        }>
          <span className="movie-card-ratings-more focus-ring" tabIndex={0} aria-label={`Ещё ${overflow.length} оценок`}>+{overflow.length}</span>
        </HoverTooltip>
      ):null}
    </div>
  );
}

export function MovieCard({ movie,index=0,remakeBadge }: MovieCardProps) {
  const primary=pickPrimaryRelease(movie.releases,movie.primaryReleaseId);
  const primaryId=primary?.id??null;
  const coverUrl=movieCoverUrlFromMovie(movie);
  const tier=primary? releaseTier(primary):null;
  const tech=primary? catalogCardTech(primary):null;
  const chipTone=tierChipTone(tier);
  const tvReady=primary? isTvReadyRelease(primary):false;

  const hdrBadge=primary? catalogHdrBadgeLabel(primary):null;
  const hdrChip=hdrBadge!=null? { short: hdrBadge,full: hdrBadge }:null;

  // Audio chip label = spatial profile or codec + channels (e.g. "DTS:X 7.1", "TrueHD 7.1").
  const audioChipLabel=primary? catalogAudioChipLabel(primary):null;
  // Narrow cards retain the codec; channel details remain in the audio popover.
  const audioCompactLabel=audioChipLabel&&tech?.channels&&audioChipLabel.endsWith(` ${tech.channels}`)
    ? audioChipLabel.slice(0,-(tech.channels.length+1))
    :audioChipLabel;

  const duration=formatDuration(
    catalogDisplayDurationSeconds(
      movie.releases,
      movie.partCount,
      movie.primaryReleaseId,
    ),
  );
  const seriesLabel=
    movie.partCount!=null&&movie.partCount>1
      ? formatSeriesCountLabel(movie.partCount)
      :null;
  const genres=orderedMovieGenres(movie).slice(0,2);
  const releaseCount=movie.releases.length;
  const showReleaseCountBadge=shouldShowCatalogReleaseCountBadge(
    releaseCount,
    movie.partCount,
    movie.releases,
  );
  const hasExternal=movieHasExternalStorage(movie.releases);
  const externalStorageNames=movieExternalStorageNames(movie.releases);
  const hasFile=movieHasFile(movie.releases);
  const releaseCountLabel=`${releaseCount} ${pluralRu(
    releaseCount,
    "релиз",
    "релиза",
    "релизов",
  )}`;
  const hasRemakeLink=
    remakeBadge!=null&&remakeBadge.coMembers.length>0;
  const remakeLinkAria=
    hasRemakeLink&&remakeBadge
      ? `${remakeRoleLabel(remakeBadge.role)??"Версия"}. ${remakeBadge.coMembers.length} ${pluralRu(
        remakeBadge.coMembers.length,
        "связанная версия",
        "связанные версии",
        "связанных версий",
      )}. Наведите для списка.`
      :undefined;

  const cardGlow=tierCardGlow(tier);
  const [displayTitle,...originalParts]=movie.title.split(" / ");
  const originalTitle=originalParts.join(" / ");

  return (
    <article
      data-tier={tier??"standard"}
      className={`movie-card group relative rounded-[var(--radius)] ${cardGlow}`}
    >
      <Link href={`/movies/${movie.slug}`} className="focus-ring block">
        <LaserCardFrame tier={tier}>
          <div
            className={`movie-card-poster relative aspect-[2/3] overflow-hidden bg-bg-base ${tierPosterGlow(tier)}`}
          >
            {coverUrl? (
              <ApiCoverImage
                src={coverUrl}
                alt={`Обложка: ${movie.title}`}
                fill
                sizes="(max-width:1024px) 33vw, (max-width:1280px) 25vw, (max-width:1536px) 20vw, (max-width:1920px) 17vw, 15vw"
                className="object-cover transition-transform duration-700 group-hover/laser:scale-[1.06]"
                style={{ transitionTimingFunction: "var(--ease)" }}
                loading={index<8? "eager":"lazy"}
                fetchPriority={index===0? "high":undefined}
              />
            ):(
              <div className="flex h-full flex-col items-center justify-center p-4 text-center">
                <CoverPlaceholderBackdrop />
                <p className="font-display relative text-lg font-bold leading-tight text-text sm:text-xl">
                  {movie.title}
                </p>
                {movie.year? (
                  <p className="font-mono-tech relative mt-2 text-accent/80">
                    {movie.year}
                  </p>
                ):null}
              </div>
            )}

            <TierCoverOverlay tier={tier} showScrim={false} holoRestOpacity="opacity-[0.07]" holoHoverOpacity="group-hover/laser:opacity-30" />

          </div>
          <div className="movie-card-details">
            <div className="movie-card-name">
              <h3
                className="movie-card-title line-clamp-2"
                title={movie.title}
              >
                {displayTitle}
              </h3>
              <div className="movie-card-subtitle">
                {movie.year? <span className="movie-card-year" title="Год выпуска">{movie.year}</span>:null}
                {originalTitle? <p className="movie-card-original" title={originalTitle}>{originalTitle}</p>:null}
                {seriesLabel? <span className="movie-card-series" title={seriesLabel} aria-label={seriesLabel}><Clapperboard aria-hidden />{movie.partCount}</span>:null}
              </div>
            </div>

            <MovieCardRatings ratings={movie.movieRatings} />

            <div className="movie-card-meta flex min-w-0 items-center gap-1.5">
              {genres.length>0? (
                <span
                  className="movie-card-genres min-w-0 flex-1 truncate text-muted"
                  title={genres
                    .map((g) => displayGenreName(g.name))
                    .join(", ")}
                >
                  {genres.map((g) => displayGenreName(g.name)).join(" · ")}
                </span>
              ):(
                <span className="movie-card-genres min-w-0 flex-1 text-faint">Без жанра</span>
              )}
              <div className="movie-card-marks flex shrink-0 items-center gap-1.5">
                {hasExternal? (
                  <ExternalStorageMark storageNames={externalStorageNames} />
                ):null}
                {tvReady? <TvReadyMark />:null}
                {hasRemakeLink&&remakeBadge? (
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
                ):null}
                {!hasFile? (
                  <span
                    className="shrink-0 text-faint"
                    title="Файл не указан"
                    aria-label="Файл не указан"
                  >
                    ◌
                  </span>
                ):null}
              </div>
              {duration? (
                <span
                  className="movie-card-duration shrink-0 tabular-nums"
                  title="Длительность"
                >
                  {duration}
                </span>
              ):null}
              {showReleaseCountBadge? (
                <HoverTooltip
                  interactive
                  className="movie-card-release-access"
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
                    className="movie-card-release-count focus-ring"
                    tabIndex={0}
                    title={`${releaseCountLabel} у фильма`}
                    aria-label={`${releaseCountLabel} у фильма. Наведите для списка.`}
                  >
                    <Layers className="h-2.5 w-2.5" aria-hidden />
                    {releaseCount}
                  </span>
                </HoverTooltip>
              ):null}
            </div>
            <div className="movie-card-specs">
              {tech?.releaseType? (
                <SpecTag variant="chip" tone={chipTone} size="xs" title={tech.releaseType}>
                  <span className="movie-card-spec-full truncate">{tech.releaseType}</span>
                  <span className="movie-card-spec-compact truncate">{tech.releaseType==="BDRemux"||tech.releaseType==="BDREMUX"? "Remux":tech.releaseType}</span>
                </SpecTag>
              ):null}
              {tech?.resolution? (
                <SpecTag variant="chip" tone={chipTone} size="xs">
                  <span className="truncate">{tech.resolution}</span>
                </SpecTag>
              ):null}
              {hdrChip? (
                <SpecTag
                  variant="chip"
                  tone={chipTone}
                  size="xs"
                  title={hdrChip.full}
                >
                  <span className="truncate">{hdrChip.short}</span>
                </SpecTag>
              ):null}
              {releaseCount===0? <span className="movie-card-no-release">Нет релизов</span>:null}

              {audioChipLabel&&primary? (
                <HoverTooltip
                  interactive
                  className="movie-card-audio"
                  content={<AudioTracksPopover release={primary} />}
                >
                  <SpecTag
                    variant="chip"
                    tone={chipTone}
                    size="xs"
                    interactive
                    title="Все аудиодорожки релиза: наведите для списка"
                  >
                    <span className="movie-card-spec-full truncate">{audioChipLabel}</span>
                    <span className="movie-card-spec-compact truncate">{audioCompactLabel}</span>
                  </SpecTag>
                </HoverTooltip>
              ):null}
            </div>
          </div>
        </LaserCardFrame>
      </Link>
    </article>
  );
}
