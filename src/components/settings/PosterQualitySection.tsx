"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ImageOff, Loader2, RefreshCw, Search } from "lucide-react";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { Button, buttonClassName } from "@/components/primitives/Button";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { apiFetch } from "@/lib/api/client";
import { movieCoverUrl } from "@/lib/covers/cover-url";
import { formatBytes } from "@/lib/shared/format-bytes";
import { searchTextIncludes } from "@/lib/shared/text-normalize";
import { POSTER_QUALITY_GROUPS, type PosterQualityMovie, type PosterQualityReport } from "@/lib/covers/poster-quality";
import "./poster-quality.css";

function PosterRow({ movie }: { movie: PosterQualityMovie }) {
  const [failed, setFailed] = useState(false);
  const metadata = movie.metadata;
  const readable = metadata?.status === "ready" && !failed;
  return (
    <li className="poster-quality-row">
      <Link href={`/movies/${movie.slug}`} className="poster-quality-thumb focus-ring" aria-label={`Открыть фильм «${movie.title}»`}>
        {readable ? (
          <ApiCoverImage
            src={movieCoverUrl(movie.id, metadata.mtimeMs)} alt="" fill sizes="44px"
            className="object-cover" onError={() => setFailed(true)}
          />
        ) : <ImageOff size={18} aria-hidden />}
      </Link>
      <div className="poster-quality-title">
        <Link href={`/movies/${movie.slug}`} className="focus-ring hover:text-accent">{movie.title}</Link>
        <p>{[movie.year, movie.status === "DRAFT" ? "Черновик" : movie.status === "EXCLUDED" ? "Скрыт" : null].filter(Boolean).join(" · ") || "Год не указан"}</p>
      </div>
      <div className="poster-quality-file">
        <strong>{metadata?.width && metadata.height ? `${metadata.width} × ${metadata.height}` : "—"}</strong>
        <span>{metadata ? [formatBytes(metadata.bytes, { unit: "binary", precision: 1 }), metadata.format?.toUpperCase()].filter(Boolean).join(" · ") : "Нет файла"}</span>
      </div>
      <Link
        href={`/movies/${movie.slug}/edit`}
        className={buttonClassName("ghost", "poster-quality-edit")}
        aria-label={`Заменить постер: ${movie.title}`}
      >
        Заменить <ArrowUpRight size={15} aria-hidden />
      </Link>
    </li>
  );
}

function PosterGroup({
  group, movies,
}: {
  group: typeof POSTER_QUALITY_GROUPS[number];
  movies: PosterQualityMovie[];
}) {
  const [limit, setLimit] = useState(20);
  const [open, setOpen] = useState(group.id !== "high");
  return (
    <details className="poster-quality-group" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="focus-ring">
        <div>
          <h3>{group.title}<span className="poster-quality-count">{movies.length}</span></h3>
          <p>{group.description}</p>
        </div>
        <ChevronDown size={18} className="poster-quality-chevron" aria-hidden />
      </summary>
      {open && (movies.length ? (
        <>
          <ul aria-label={`Постеры: ${group.title}`}>
            {movies.slice(0, limit).map((movie) => <PosterRow key={`${movie.id}:${movie.metadata?.mtimeMs}`} movie={movie} />)}
          </ul>
          {movies.length > limit && (
            <Button type="button" variant="ghost" className="mt-3" onClick={() => setLimit((current) => current + 20)}>
              Показать ещё {Math.min(20, movies.length - limit)}
            </Button>
          )}
        </>
      ) : <p className="poster-quality-empty">В этой группе нет фильмов.</p>)}
    </details>
  );
}

export function PosterQualitySection() {
  const [report, setReport] = useState<PosterQualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState("CATALOG");
  const request = useRef<AbortController | null>(null);

  const refresh = useCallback(async (force = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<PosterQualityReport>("/api/covers/quality", {
        method: force ? "POST" : "GET", signal: controller.signal, cache: "no-store",
      });
      if (!controller.signal.aborted) setReport(result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Не удалось проверить постеры.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        request.current = null;
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0);
    const onFocus = () => { if (!request.current || request.current.signal.aborted) void refresh(); };
    // Refetch when returning after editing a poster in another browser tab.
    const onVisible = () => { if (document.visibilityState === "visible" && !request.current) void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const movies = (report?.movies ?? []).filter((movie) =>
    (scope === "ALL" || movie.status === scope) && searchTextIncludes(movie.title, query),
  );
  const high = movies.filter((movie) => movie.quality === "high").length;
  const attention = movies.filter((movie) => ["low", "missing", "unreadable"].includes(movie.quality)).length;

  return (
    <MachinedCard variant="calm">
      <div className="poster-quality-heading">
        <CardSectionHeader label="обложки" title="Качество постеров" />
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh(true)}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
          Обновить
        </Button>
      </div>
      <p className="poster-quality-intro">
        Найдите обложки, которые стоит заменить. Оцениваем разрешение области 2:3,
        видимой в карточке фильма. Резкость и следы сжатия лучше проверить на глаз.
      </p>
      <div className="poster-quality-filters">
        <div className="poster-quality-search">
          <Search size={17} aria-hidden />
          <input aria-label="Найти фильм по названию" placeholder="Найти фильм…" value={query}
            onChange={(event) => setQuery(event.target.value)} className="focus-ring" type="search" />
        </div>
        <select aria-label="Фильмы в списке постеров" value={scope} onChange={(event) => setScope(event.target.value)} className="focus-ring">
          <option value="CATALOG">В каталоге</option>
          <option value="DRAFT">Черновики</option>
          <option value="EXCLUDED">Скрытые</option>
          <option value="ALL">Все фильмы</option>
        </select>
      </div>
      {error && <p role="alert" className="my-4 text-sm text-danger">{error}</p>}
      {loading && <p role="status" className="poster-quality-loading"><Loader2 size={16} className="animate-spin" aria-hidden />{report ? "Проверяем изменения…" : "Читаем размеры обложек…"}</p>}
      {report && (
        <>
          <div className="poster-quality-summary" role="status">
            <span><strong>{movies.length}</strong> фильмов</span>
            <span><strong>{attention}</strong> требуют внимания</span>
            <span><strong className="text-accent">{high}</strong> с высоким разрешением</span>
          </div>
          {movies.length === 0 ? (
            <p className="poster-quality-empty">Фильмов не найдено. Измените запрос или выберите другой список.</p>
          ) : POSTER_QUALITY_GROUPS.map((group) => (
            <PosterGroup key={`${group.id}:${scope}:${query}`} group={group} movies={movies.filter((movie) => movie.quality === group.id)} />
          ))}
          <p className="poster-quality-updated">
            Проверено {new Date(report.checkedAt).toLocaleString("ru-RU")}. После замены обложки данные обновляются автоматически.
          </p>
        </>
      )}
    </MachinedCard>
  );
}
