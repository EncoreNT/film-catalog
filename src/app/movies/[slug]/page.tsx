import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Library, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { fetchMergeCandidatesForGroup } from "@/lib/merge-preview";
import { MovieApproveButton } from "@/components/MovieApproveButton";
import { MovieRating } from "@/components/MovieRating";
import { MovieReleasePanel } from "@/components/MovieReleasePanel";
import { DuplicateMergeBanner } from "@/components/DuplicateMergeBanner";
import { movieInclude } from "@/lib/movie-include";
import {
  formatDate,
  formatDuration,
  formatRelativeDate,
} from "@/lib/format";
import { genreLabel } from "@/lib/dictionaries";
import { orderedMovieGenres } from "@/lib/movie-genres";
import { movieCoverUrlFromMovie } from "@/lib/cover-url";
import { pickPrimaryRelease } from "@/lib/release-primary";
import { buildReleaseDetailViews } from "@/lib/release-detail-view";
import type { ReleaseWithTracks } from "@/lib/movie-query";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ release?: string }>;
}

export default async function MoviePage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;

  const movie = await prisma.movie.findUnique({
    where: { slug },
    include: movieInclude,
  });

  if (!movie) notFound();

  const releases = movie.releases as ReleaseWithTracks[];
  const releaseIdParam = resolvedSearch.release
    ? Number(resolvedSearch.release)
    : null;
  const activeRelease =
    (releaseIdParam ? releases.find((r) => r.id === releaseIdParam) : null) ??
    pickPrimaryRelease(releases) ??
    releases[0] ??
    null;

  const franchiseMemberships = await prisma.franchiseSlot.findMany({
    where: { movieId: movie.id },
    include: { franchise: { select: { id: true, name: true, slug: true } } },
  });

  const mergeCandidates = await fetchMergeCandidatesForGroup(movie);

  const coverUrl = movieCoverUrlFromMovie(movie);
  const genres = orderedMovieGenres(movie);
  const releaseViews = buildReleaseDetailViews(releases);
  const displayDuration =
    activeRelease?.durationSeconds ?? releases[0]?.durationSeconds ?? null;

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Назад к каталогу
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {movie.status === "DRAFT" ? (
            <MovieApproveButton movieId={movie.id} title={movie.title} />
          ) : null}
          <Link
            href={`/movies/${movie.slug}/edit`}
            className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:text-accent hover:bg-bg-surface-hover hover:shadow-[0_0_20px_var(--accent-glow)]"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            Редактировать фильм
          </Link>
        </div>
      </div>

      {mergeCandidates.length > 1 ? (
        <DuplicateMergeBanner
          currentMovieId={movie.id}
          candidates={mergeCandidates}
        />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <div className="surface-card relative aspect-[2/3] overflow-hidden">
            {coverUrl ? (
              <ApiCoverImage
                src={coverUrl}
                alt={`Обложка: ${movie.title}`}
                fill
                sizes="280px"
                className="object-cover"
                loading="eager"
                fetchPriority="high"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6 text-center">
                <p className="font-display text-xl font-bold">{movie.title}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <header>
            <p className="font-mono-tech text-accent">
              {movie.status === "DRAFT"
                ? "черновик"
                : movie.status === "EXCLUDED"
                  ? "исключён"
                  : "каталог"}
            </p>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              {movie.title}
            </h1>
            <div className="font-mono-tech mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              {movie.year ? <span>{movie.year}</span> : null}
              {displayDuration ? (
                <>
                  {movie.year ? <span aria-hidden>·</span> : null}
                  <span>{formatDuration(displayDuration, "long")}</span>
                </>
              ) : null}
            </div>
            {genres.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {genres.map((g) => (
                  <span
                    key={g.id}
                    className="font-mono-tech rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs text-text"
                  >
                    {genreLabel(g.name) ?? g.name}
                  </span>
                ))}
              </div>
            ) : null}

            {movie.description ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                {movie.description}
              </p>
            ) : null}
            {franchiseMemberships.length > 0 ? (
              <section className="mt-6 border-t border-border pt-5">
                <h2 className="font-mono-tech mb-3 text-faint">
                  входит во франшизы
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {franchiseMemberships.map((membership) => (
                    <li key={membership.id}>
                      <Link
                        href={`/franchises/${membership.franchise.slug}`}
                        className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1.5 text-xs text-text transition-colors hover:border-accent/50 hover:text-accent"
                      >
                        <Library className="h-3.5 w-3.5 text-accent" aria-hidden />
                        {membership.franchise.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </header>

          {releaseViews.length > 0 ? (
            <MovieReleasePanel
              movieId={movie.id}
              movieSlug={movie.slug}
              releases={releaseViews}
              initialActiveReleaseId={activeRelease?.id ?? releaseViews[0].id}
            />
          ) : (
            <section className="surface-card p-5">
              <p className="text-sm text-muted">У фильма пока нет релизов.</p>
              <Link
                href={`/movies/${movie.slug}/releases/new`}
                className="focus-ring mt-3 inline-flex items-center gap-2 text-sm text-accent hover:underline"
              >
                Добавить релиз
              </Link>
            </section>
          )}

          <section className="surface-card p-4 sm:p-5">
            <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
              <div className="flex flex-col gap-2 sm:flex-1 sm:pr-5">
                <span className="font-mono-tech text-faint">оценка</span>
                <MovieRating
                  movieId={movie.id}
                  value={movie.rating}
                  watchedAt={movie.watchedAt}
                />
              </div>
              <div
                className="hidden w-px self-stretch bg-border sm:block"
                aria-hidden
              />
              <div className="flex flex-col gap-2 sm:flex-1 sm:pl-5">
                <span className="font-mono-tech text-faint">просмотрен</span>
                {movie.watchedAt ? (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xl font-medium tracking-wide text-text">
                      {formatDate(movie.watchedAt)}
                    </span>
                    {formatRelativeDate(movie.watchedAt) ? (
                      <span className="font-mono-tech text-accent/80">
                        {formatRelativeDate(movie.watchedAt)}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <span className="font-mono text-sm text-faint">
                    не отмечено
                  </span>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
