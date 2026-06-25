"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { formatDuration, formatVideoTicket } from "@/lib/format";
import { genreLabel } from "@/lib/dictionaries";

interface MovieCardProps {
  movie: MovieWithTracks;
  selected?: boolean;
  onSelect?: (id: number, selected: boolean) => void;
  index?: number;
}

export function MovieCard({
  movie,
  selected,
  onSelect,
  index = 0,
}: MovieCardProps) {
  const coverUrl = movie.coverPath ? `/api/covers/${movie.id}` : null;

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
      {onSelect ? (
        <label className="absolute left-2 top-2 z-20 flex h-11 w-11 cursor-pointer items-center justify-center">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect(movie.id, e.target.checked)}
            className="focus-ring h-5 w-5 cursor-pointer accent-accent"
            aria-label={`Выбрать ${movie.title}`}
          />
        </label>
      ) : null}

      {movie.rating != null ? (
        <span className="font-mono-tech absolute right-2 top-2 z-20 rounded-full border border-accent/40 bg-bg-deep/90 px-2 py-1 text-accent shadow-[0_0_16px_var(--accent-glow)]">
          {movie.rating}/10
        </span>
      ) : null}

      <Link href={`/movies/${movie.id}`} className="focus-ring block rounded-[var(--radius)]">
        <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius)] border border-border-strong bg-gradient-to-b from-bg-elevated to-bg-base transition-all duration-300 group-hover:scale-[1.03] group-hover:border-accent/50 group-hover:shadow-[0_0_36px_var(--accent-glow)]">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={`Обложка: ${movie.title}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
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
              <p className="font-display relative text-lg font-bold leading-tight text-text">
                {movie.title}
              </p>
              {movie.year ? (
                <p className="font-mono-tech relative mt-2 text-accent/80">
                  {movie.year}
                </p>
              ) : null}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-deep via-bg-deep/85 to-transparent p-3 pt-14">
            <h3 className="font-display line-clamp-2 text-sm font-semibold leading-snug text-text">
              {movie.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <p className="font-mono-tech text-[0.65rem] text-muted">
                {formatVideoTicket(movie)}
              </p>
              {movie.durationSeconds ? (
                <>
                  <span className="font-mono-tech text-[0.6rem] text-faint">·</span>
                  <span className="font-mono-tech text-[0.65rem] text-muted">
                    {formatDuration(movie.durationSeconds)}
                  </span>
                </>
              ) : null}
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
            {movie.genres.length > 0 ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {movie.genres.slice(0, 2).map((g) => (
                  <span
                    key={g.id}
                    className="font-mono-tech rounded-full border border-border/60 bg-bg-deep/60 px-2 py-0.5 text-[0.6rem] text-muted"
                  >
                    {genreLabel(g.name) ?? g.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
