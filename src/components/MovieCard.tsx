"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MonitorPlay, Star, Sun, Waves } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { formatDuration } from "@/lib/format";
import { genreLabel } from "@/lib/dictionaries";
import { PremiumBadge } from "./PremiumBadge";
import { SpecTag } from "./SpecTag";
import {
  catalogCardTags,
  is4K,
  premiumAudio,
  premiumHDR,
} from "@/lib/spec-tags";

interface MovieCardProps {
  movie: MovieWithTracks;
  index?: number;
}

export function MovieCard({ movie, index = 0 }: MovieCardProps) {
  const coverUrl = movie.coverPath ? `/api/covers/${movie.id}` : null;
  const premium4K = is4K(movie);
  const premiumHdr = premiumHDR(movie);
  const premiumAtmos = premiumAudio(movie);
  const footerTags = catalogCardTags(movie);
  const duration = formatDuration(movie.durationSeconds);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.04, 0.4),
        ease: [0.16, 1, 0.3, 1],
      }}
      className="group relative"
    >
      <Link href={`/movies/${movie.id}`} className="focus-ring block rounded-[var(--radius)]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-gradient-to-b from-bg-elevated to-bg-base transition-all duration-300 group-hover:scale-[1.02] group-hover:border-accent/50 group-hover:shadow-[0_0_40px_var(--accent-glow)]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`Обложка: ${movie.title}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
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
              className="font-mono-tech absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-accent/40 bg-bg-deep/90 px-2 py-1 text-xs text-accent shadow-[0_0_16px_var(--accent-glow)]"
              aria-label={`Оценка ${movie.rating} из 10`}
              title={`Оценка ${movie.rating} из 10`}
            >
              {movie.rating}
              <Star className="h-3 w-3 fill-accent text-accent" aria-hidden />
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
                {movie.genres.slice(0, 2).map((g) => (
                  <span
                    key={g.id}
                    className="font-mono-tech rounded-full border border-border/60 bg-bg-deep/60 px-2 py-0.5 text-[0.6rem] text-muted"
                  >
                    {genreLabel(g.name) ?? g.name}
                  </span>
                ))}
                {movie.storage?.type === "EXTERNAL" ? (
                  <span
                    className="font-mono-tech text-[0.6rem] text-accent/80"
                    title={`Внешний диск: ${movie.storage.name}`}
                    aria-label={`Внешний диск: ${movie.storage.name}`}
                  >
                    ▣
                  </span>
                ) : null}
                {!movie.filePath ? (
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
    </motion.article>
  );
}
