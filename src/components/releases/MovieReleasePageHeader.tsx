"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { DetailMetaLine } from "@/components/primitives/DetailMetaLine";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { movieCoverUrlFromMovie } from "@/lib/covers/cover-url";

export interface MovieReleasePageHeaderMovie {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  coverPath: string | null;
  updatedAt: Date;
}

interface MovieReleasePageHeaderProps {
  movie: MovieReleasePageHeaderMovie;
  eyebrow: string;
  releaseLabel?: string;
}

export function MovieReleasePageHeader({
  movie,
  eyebrow,
  releaseLabel,
}: MovieReleasePageHeaderProps) {
  const headerRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const header = headerRef.current;
    const text = textRef.current;
    if (!header || !text) return;
    const measure = () =>
      header.style.setProperty(
        "--release-header-height",
        `${text.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, []);
  const coverUrl = movieCoverUrlFromMovie(movie);
  const [title, ...otherTitles] = movie.title.trim().split(" / ");
  const originalTitle = otherTitles.join(" / ");

  return (
    <header ref={headerRef} className="flex gap-4 sm:gap-5">
      <Link
        href={`/movies/${movie.slug}`}
        className="focus-ring group shrink-0"
        title={`Открыть «${movie.title}»`}
      >
        <div className="surface-card relative aspect-[2/3] w-[4.5rem] overflow-hidden transition-colors group-hover:ring-1 group-hover:ring-accent/40 sm:w-[5.5rem]">
          {coverUrl ? (
            <ApiCoverImage
              src={coverUrl}
              alt={`Обложка: ${movie.title}`}
              fill
              sizes="(max-width: 767px) 112px, 160px"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-bg-elevated p-2 text-center">
              <span className="font-display text-[10px] font-bold leading-tight text-muted sm:text-xs">
                {movie.title}
              </span>
            </div>
          )}
        </div>
      </Link>

      <div ref={textRef} className="min-w-0 flex-1 pt-0.5">
        <p className="font-mono-tech text-accent">{eyebrow}</p>
        <h1 className="font-display mt-1.5 text-2xl font-bold tracking-tight sm:mt-2 sm:text-3xl">
          {title}
        </h1>
        {originalTitle ? (
          <p className="release-original-title font-display mt-1 text-xl text-muted">
            {originalTitle}
          </p>
        ) : null}
        <DetailMetaLine
          className="mt-2 text-sm"
          items={[
            {
              key: "year",
              node: movie.year ? <span>{movie.year}</span> : null,
            },
            {
              key: "release",
              node: releaseLabel ? <span>{releaseLabel}</span> : null,
            },
          ]}
        />
      </div>
    </header>
  );
}
