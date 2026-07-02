"use client";

import Link from "next/link";
import { MonitorPlay, Star, Sun, Waves, Layers } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { formatDuration } from "@/lib/format";
import { movieCoverUrlFromMovie } from "@/lib/cover-url";
import { orderedMovieGenres } from "@/lib/movie-genres";
import { genreLabel } from "@/lib/dictionaries";
import { ApiCoverImage } from "./primitives/ApiCoverImage";
import { PremiumBadge } from "./PremiumBadge";
import { SpecTag } from "./SpecTag";
import {
  catalogCardTags,
  is4K,
  isAnyHDR,
  premiumAudio,
  premiumHDR,
} from "@/lib/spec-tags";
import {
  movieHasExternalStorage,
  movieHasFile,
  pickPrimaryRelease,
} from "@/lib/release-primary";

interface MovieCardProps {
  movie: MovieWithTracks;
  index?: number;
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const primary = pickPrimaryRelease(movie.releases);
  const coverUrl = movieCoverUrlFromMovie(movie);
  const premium4K = primary ? is4K(primary) : false;
  const premiumHdr = primary ? premiumHDR(primary) : null;
  const premiumAtmos = primary ? premiumAudio(primary) : null;
  const isTopTier = Boolean(
    primary && premium4K && isAnyHDR(primary) && premiumAtmos,
  );
  const footerTags = primary ? catalogCardTags(primary) : [];
  const duration = formatDuration(primary?.durationSeconds ?? null);
  const genres = orderedMovieGenres(movie);
  const releaseCount = movie.releases.length;
  const hasExternal = movieHasExternalStorage(movie.releases);
  const hasFile = movieHasFile(movie.releases);

  return (
    <article
      className="group relative transition-transform duration-500 ease-[cubic-bezier(0.65,0,0.35,1)] hover:scale-[1.03]"
    >
      <Link href={`/movies/${movie.slug}`} className="focus-ring block rounded-[var(--radius)]">
        <div
          className={`relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] border bg-gradient-to-b from-bg-elevated to-bg-base transition-[border-color,box-shadow] duration-500 ${
            isTopTier
              ? "border-accent/35 shadow-[0_0_0_1px_rgba(232,176,90,0.18),0_6px_22px_-8px_rgba(232,176,90,0.35),0_0_28px_var(--accent-glow)] group-hover:border-accent/70 group-hover:shadow-[0_0_0_1px_rgba(232,176,90,0.5),0_18px_44px_-10px_rgba(232,176,90,0.6),0_0_70px_var(--accent-glow)]"
              : "border-border-strong group-hover:border-accent/50 group-hover:shadow-[0_0_40px_var(--accent-glow)]"
          }`}
          style={{ transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)" }}
        >
          {isTopTier ? (
            <>
              <span
                className="pointer-events-none absolute inset-0 z-0 opacity-60 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
                style={{
                  transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
                  background:
                    "conic-gradient(from 200deg at 0% 0%, var(--accent-soft) 0deg, rgba(232,176,90,0.16) 14deg, transparent 32deg)",
                  mixBlendMode: "screen",
                }}
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 z-0 h-2/3 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
                aria-hidden
                style={{
                  transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)",
                  background:
                    "radial-gradient(ellipse 75% 55% at 12% -8%, rgba(246,200,120,0.22) 0%, transparent 62%)",
                }}
              />
              <span
                className="pointer-events-none absolute inset-0 z-0 opacity-[0.07]"
                aria-hidden
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, transparent 0 3px, rgba(0,0,0,0.5) 3px 4px)",
                }}
              />
            </>
          ) : null}
          {coverUrl ? (
            <ApiCoverImage
              src={coverUrl}
              alt={`Обложка: ${movie.title}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.06]"
              style={{ transitionTimingFunction: "var(--ease)" }}
              loading={index < 8 ? "eager" : "lazy"}
              fetchPriority={index === 0 ? "high" : undefined}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-4 text-center">
              <div
                className="absolute inset-0 opacity-60"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(ellipse 80% 60% at 50% 30%, var(--accent-soft) 0%, transparent 70%)",
                }}
              />
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

          {(premium4K || premiumHdr || premiumAtmos) && (
            <div className="absolute left-2 top-2 z-10 flex max-w-[calc(100%-3.5rem)] flex-col gap-1">
              {premium4K ? (
                <PremiumBadge
                  size="sm"
                  icon={<MonitorPlay className="h-2.5 w-2.5" />}
                  label="4K"
                />
              ) : null}
              {premiumHdr ? (
                <PremiumBadge
                  size="sm"
                  icon={<Sun className="h-2.5 w-2.5" />}
                  label={premiumHdr.label}
                />
              ) : null}
              {premiumAtmos ? (
                <PremiumBadge
                  size="sm"
                  icon={<Waves className="h-2.5 w-2.5" />}
                  label={premiumAtmos.label}
                />
              ) : null}
            </div>
          )}

          {movie.rating != null ? (
            <span
              className="font-mono-tech absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-bg-deep/90 px-2 py-1 text-xs text-accent shadow-[0_0_16px_var(--accent-glow)] transition-[border-color,box-shadow] duration-500 group-hover:border-accent/70 group-hover:shadow-[0_0_24px_var(--accent-glow)]"
              style={{ transitionTimingFunction: "cubic-bezier(0.65, 0, 0.35, 1)" }}
              aria-label={`Оценка ${movie.rating} из 10`}
              title={`Оценка ${movie.rating} из 10`}
            >
              {movie.rating}
              <Star className="h-3 w-3 fill-accent text-accent" aria-hidden />
            </span>
          ) : null}

          {releaseCount > 1 ? (
            <span
              className="font-mono-tech absolute right-2 top-12 z-10 inline-flex items-center gap-1 rounded-full border border-border-strong bg-bg-deep/90 px-2 py-1 text-[0.65rem] text-muted"
              title={`${releaseCount} релиза`}
            >
              <Layers className="h-3 w-3" aria-hidden />
              ×{releaseCount}
            </span>
          ) : null}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-deep via-bg-deep/92 to-transparent px-3 pb-3 pt-16">
            <h3 className="font-display line-clamp-2 text-base font-semibold leading-snug text-text sm:text-lg">
              {movie.title}
            </h3>

            {footerTags.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {footerTags.map((tag) => (
                  <SpecTag
                    key={`${tag.kind}-${tag.label}`}
                    kind={tag.kind}
                    note={tag.note}
                  >
                    {tag.label}
                  </SpecTag>
                ))}
              </div>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {genres.slice(0, 2).map((g) => (
                  <span
                    key={g.id}
                    className="font-mono-tech rounded-full border border-border/60 bg-bg-deep/60 px-2 py-0.5 text-[0.6rem] text-muted"
                  >
                    {genreLabel(g.name) ?? g.name}
                  </span>
                ))}
                {hasExternal ? (
                  <span
                    className="font-mono-tech text-[0.6rem] text-accent/80"
                    title="Есть релиз на внешнем диске"
                    aria-label="Есть релиз на внешнем диске"
                  >
                    ▣
                  </span>
                ) : null}
                {!hasFile ? (
                  <span
                    className="font-mono-tech text-[0.6rem] text-faint"
                    title="Файл не указан"
                    aria-label="Файл не указан"
                  >
                    ◌
                  </span>
                ) : null}
              </div>
              {duration ? (
                <span className="font-mono-tech shrink-0 text-[0.65rem] text-muted">
                  {duration}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}
