import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  MonitorPlay,
  Sun,
  Waves,
  Disc3,
  AudioLines,
  Star,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MovieRating } from "@/components/MovieRating";
import { SpecTag } from "@/components/SpecTag";
import { PremiumBadge } from "@/components/PremiumBadge";
import { movieInclude } from "@/lib/movie-include";
import {
  formatDate,
  formatDuration,
  formatRelativeDate,
} from "@/lib/format";
import { genreLabel } from "@/lib/dictionaries";
import {
  codecFull,
  codecShort,
  is4K,
  premiumAudio,
  secondaryTags,
  translationShort,
  videoBitrateLabel,
  videoResolutionPixels,
} from "@/lib/spec-tags";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) notFound();

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    include: movieInclude,
  });

  if (!movie) notFound();

  const coverUrl = movie.coverPath ? `/api/covers/${movie.id}` : null;
  const tags = secondaryTags(movie);
  const vBitrate = videoBitrateLabel(movie);
  const vPixels = videoResolutionPixels(movie);
  const premium4K = is4K(movie);
  const premiumAtmos = premiumAudio(movie);
  const showPremiumStrip = premium4K || premiumAtmos != null;

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
        <Link
          href={`/movies/${movie.id}/edit`}
          className="focus-ring inline-flex items-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:text-accent hover:bg-bg-surface-hover hover:shadow-[0_0_20px_var(--accent-glow)]"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Редактировать
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="mx-auto w-full max-w-[280px]">
          <div className="surface-card relative aspect-[2/3] overflow-hidden">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={`Обложка: ${movie.title}`}
                fill
                sizes="280px"
                className="object-cover"
                priority
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
              {movie.status === "DRAFT" ? "черновик" : movie.status === "EXCLUDED" ? "исключён" : "каталог"}
            </p>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
              {movie.title}
            </h1>
            <div className="font-mono-tech mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              {movie.year ? <span>{movie.year}</span> : null}
              {movie.durationSeconds ? (
                <>
                  {movie.year ? <span aria-hidden>·</span> : null}
                  <span>{formatDuration(movie.durationSeconds, "long")}</span>
                </>
              ) : null}
            </div>
            {movie.genres.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {movie.genres.map((g) => (
                  <span
                    key={g.id}
                    className="font-mono-tech rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs text-text"
                  >
                    {genreLabel(g.name) ?? g.name}
                  </span>
                ))}
              </div>
            ) : null}
            {showPremiumStrip ? (
              <div className="mt-5 flex flex-wrap items-start gap-3 border-t border-accent/15 pt-5">
                {premium4K ? (
                  <PremiumBadge
                    icon={<MonitorPlay className="h-4 w-4" />}
                    label="4K"
                    sublabel="Ultra HD"
                    tag={vPixels ?? undefined}
                  />
                ) : null}
                {premiumAtmos ? (
                  <PremiumBadge
                    icon={<Waves className="h-4 w-4" />}
                    label={premiumAtmos.label}
                    sublabel={premiumAtmos.channelLayout ?? "Object Audio"}
                    tag="RU · главная дорожка"
                  />
                ) : null}
              </div>
            ) : null}
            {tags.length > 0 ? (
              <div className="mt-4">
                <p className="font-mono-tech mb-2 text-faint">характеристики</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, i) => {
                    const icon = (() => {
                      switch (tag.kind) {
                        case "resolution":
                          return <MonitorPlay className="h-3.5 w-3.5" />;
                        case "hdr":
                          return <Sun className="h-3.5 w-3.5" />;
                        case "audio-3d":
                          return <Waves className="h-3.5 w-3.5" />;
                        case "audio":
                          return <AudioLines className="h-3.5 w-3.5" />;
                        case "release":
                          return <Disc3 className="h-3.5 w-3.5" />;
                        case "channel":
                          return null;
                      }
                    })();
                    return (
                      <SpecTag
                        key={`${tag.kind}-${tag.label}-${i}`}
                        kind={tag.kind}
                        icon={icon}
                        note={tag.note}
                      >
                        {tag.label}
                      </SpecTag>
                    );
                  })}
                </div>
              </div>
            ) : null}
            {movie.description ? (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
                {movie.description}
              </p>
            ) : null}
          </header>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-mono-tech mb-4 text-muted">видео</h2>
            {movie.videoTrack || movie.releaseType ? (
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="col-span-2 sm:col-span-1">
                  <dt className="font-mono-tech text-faint">разрешение</dt>
                  <dd className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-semibold leading-none text-text">
                      {movie.videoTrack?.resolutionLabel &&
                      movie.videoTrack.resolutionLabel !== "other"
                        ? movie.videoTrack.resolutionLabel === "4K"
                          ? "4K"
                          : movie.videoTrack.resolutionLabel
                        : "—"}
                    </span>
                    {vPixels ? (
                      <span className="font-mono text-xs text-muted">
                        {vPixels}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <dt className="font-mono-tech text-faint">битрейт</dt>
                  <dd className="mt-1.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-2xl font-medium leading-none text-text">
                      {vBitrate ? vBitrate.replace(/[a-z]+/i, "").trim() : "—"}
                    </span>
                    {vBitrate ? (
                      <span className="font-mono text-xs text-muted">
                        {vBitrate.match(/[a-zA-Z]+/)?.[0] ?? ""}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div className="col-span-1">
                  <dt className="font-mono-tech text-faint">кодек</dt>
                  <dd className="font-mono mt-1.5 text-sm text-muted">
                    {movie.videoTrack?.codec
                      ? codecShort(movie.videoTrack.codec) ??
                        movie.videoTrack.codec.toUpperCase()
                      : "—"}
                  </dd>
                </div>
                <div className="col-span-1">
                  <dt className="font-mono-tech text-faint">fps</dt>
                  <dd className="font-mono mt-1.5 text-sm text-muted">
                    {movie.videoTrack?.fps
                      ? `${Math.round(
                          (typeof movie.videoTrack.fps === "string"
                            ? parseFloat(movie.videoTrack.fps)
                            : movie.videoTrack.fps) * 100,
                        ) / 100}`
                      : "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-muted">Нет данных</p>
            )}
          </section>

          <section className="surface-card p-5 sm:p-6">
            <h2 className="font-mono-tech mb-4 text-muted">аудиодорожки</h2>
            {movie.audioTracks.length === 0 ? (
              <p className="text-sm text-muted">Нет данных</p>
            ) : (
              <div className="space-y-1">
                <div
                  className="font-mono-tech grid grid-cols-[20px_56px_minmax(96px,1fr)_minmax(110px,1.4fr)_60px_72px] items-center gap-x-2 gap-y-1 border-b border-border pb-2 text-faint"
                  aria-hidden
                >
                  <span />
                  <span>язык</span>
                  <span>перевод</span>
                  <span>формат</span>
                  <span>каналы</span>
                  <span className="text-right">битрейт</span>
                </div>
                {[...movie.audioTracks]
                  .sort((a, b) => {
                    if (a.isDefault && !b.isDefault) return -1;
                    if (!a.isDefault && b.isDefault) return 1;
                    return 0;
                  })
                  .map((track) => {
                  const profile =
                    track.profile && track.profile !== "None"
                      ? track.profile
                      : null;
                  const is3D =
                    profile === "Atmos" || profile === "DTS:X MA";
                  const formatLabel =
                    profile === "Atmos"
                      ? "Dolby Atmos"
                      : profile === "DTS:X MA"
                        ? "DTS:X"
                        : profile === "HD MA"
                          ? "DTS-HD MA"
                          : codecShort(track.codec);
                  const langLabel = track.language
                    ? track.language.toUpperCase()
                    : null;
                  const translation = translationShort(track.translationType);
                  const bitrate = track.bitrate
                    ? track.bitrate >= 1000
                      ? `${(track.bitrate / 1000).toFixed(1)}Mbps`
                      : `${track.bitrate}kbps`
                    : null;
                  return (
                    <div
                      key={track.id}
                      className="grid grid-cols-[20px_56px_minmax(96px,1fr)_minmax(110px,1.4fr)_60px_72px] items-center gap-x-2 gap-y-1 border-b border-border/60 py-2.5 last:border-0 last:pb-1"
                    >
                      <span className="flex items-center">
                        {track.isDefault ? (
                          <Star
                            className="h-3.5 w-3.5 fill-accent text-accent"
                            aria-label="Главная дорожка"
                          />
                        ) : null}
                      </span>
                      <span className="flex items-center">
                        {langLabel ? (
                          <span
                            className={`font-mono rounded-md px-2 py-1 text-xs tracking-wide ${
                              track.language === "rus"
                                ? "bg-bg-elevated text-text"
                                : "text-muted"
                            }`}
                          >
                            {langLabel}
                          </span>
                        ) : (
                          <span className="font-mono text-sm text-faint">—</span>
                        )}
                      </span>
                      <span className="flex items-center">
                        {translation ? (
                          <span className="font-mono-tech rounded-md border border-border bg-bg-surface px-2 py-1 text-[0.65rem] text-muted">
                            {translation}
                          </span>
                        ) : (
                          <span className="font-mono text-sm text-faint">—</span>
                        )}
                      </span>
                      <span className="flex items-center">
                        {formatLabel ? (
                          is3D ? (
                            <SpecTag
                              kind="audio-3d"
                              icon={<Waves className="h-3.5 w-3.5" />}
                              note={codecFull(track.codec) ?? undefined}
                            >
                              {formatLabel}
                            </SpecTag>
                          ) : (
                            <SpecTag
                              kind="audio"
                              note={codecFull(track.codec) ?? undefined}
                            >
                              {formatLabel}
                            </SpecTag>
                          )
                        ) : (
                          <span className="font-mono text-sm text-faint">—</span>
                        )}
                      </span>
                      <span className="flex items-center">
                        {track.channelLayout && track.channelLayout !== "other" ? (
                          <SpecTag kind="channel">{track.channelLayout}</SpecTag>
                        ) : (
                          <span className="font-mono text-sm text-faint">—</span>
                        )}
                      </span>
                      <span className="font-mono text-right text-xs text-muted tabular-nums">
                        {bitrate ?? "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="surface-card p-4 sm:p-5">
            <h2 className="font-mono-tech mb-3 text-muted">оценка и просмотр</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-0">
              <div className="flex flex-col gap-2 sm:flex-1 sm:pr-5">
                <span className="font-mono-tech text-faint">оценка</span>
                <MovieRating movieId={movie.id} value={movie.rating} watchedAt={movie.watchedAt} />
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

          <section className="surface-card p-5">
            <h2 className="font-mono-tech mb-4 text-muted">субтитры</h2>
            {movie.subtitleTracks.length === 0 ? (
              <p className="text-sm text-muted">Нет субтитров</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {movie.subtitleTracks.map((track) => (
                  <li key={track.id} className="flex flex-wrap gap-2">
                    <span className="font-mono-tech text-text">
                      {track.codecLabel ?? track.codec ?? "—"}
                    </span>
                    <span className="text-muted">·</span>
                    <span>{track.language ?? "—"}</span>
                    {track.forced ? (
                      <span className="font-mono-tech text-accent">forced</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="font-mono-tech mb-4 text-muted">файл</h2>
            {movie.filePath ? (
              <p className="break-all text-xs text-muted">{movie.filePath}</p>
            ) : (
              <p className="font-mono-tech text-xs text-faint">
                путь не указан
              </p>
            )}
            {movie.storage ? (
              <p className="font-mono-tech mt-3 inline-flex items-center gap-1.5 text-xs text-accent">
                {movie.storage.type === "EXTERNAL" ? "▣" : "■"}
                {movie.storage.name}
              </p>
            ) : null}
            <p className="font-mono-tech mt-2 text-xs text-muted">
              добавлен {formatDate(movie.createdAt)} · обновлён{" "}
              {formatDate(movie.updatedAt)}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
