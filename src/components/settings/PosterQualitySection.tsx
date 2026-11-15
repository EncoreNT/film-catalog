"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ImageOff, RefreshCw, Search, TriangleAlert, CircleCheck, ScanLine, FileWarning, Pencil } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/primitives/Button";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import { Select } from "@/components/primitives/Select";
import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";
import { apiFetch } from "@/lib/api/client";
import { movieCoverUrl } from "@/lib/covers/cover-url";
import { formatBytes } from "@/lib/shared/format-bytes";
import { searchTextIncludes } from "@/lib/shared/text-normalize";
import { POSTER_QUALITY_GROUPS, type PosterQualityMovie, type PosterQualityReport } from "@/lib/covers/poster-quality";
import "./poster-quality.css";

const GROUP_PRESENTATION = {
  low: { icon: TriangleAlert, label: "Стоит заменить" },
  medium: { icon: ScanLine, label: "Можно улучшить" },
  high: { icon: CircleCheck, label: "Готово к просмотру" },
  missing: { icon: ImageOff, label: "Нужен постер" },
  unreadable: { icon: FileWarning, label: "Проверьте файл" },
};

function PosterRow({ movie, onUploaded }: {
  movie: PosterQualityMovie; onUploaded: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const metadata = movie.metadata;
  const readable = metadata?.status === "ready" && !failed;
  const [title, ...otherTitles] = movie.title.split(" / ");
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
        <strong>{metadata?.width && metadata.height ? `${metadata.width} × ${metadata.height}` : "Нет данных"}</strong>
        <span>{metadata ? [formatBytes(metadata.bytes, { unit: "binary", precision: 1 }), metadata.format?.toUpperCase()].filter(Boolean).join(" · ") : "Нет файла"}</span>
      </div>
      <div className="poster-quality-actions">
        <CoverUpload movieId={movie.id} hasCover={metadata?.status === "ready"}
          coverVersion={metadata?.mtimeMs ?? movie.coverVersion}
          movieTitle={title} originalTitle={otherTitles.join(" / ")} movieYear={movie.year}
          onUploaded={onUploaded}
          renderTrigger={(open) => (
            <button type="button" className="poster-quality-action focus-ring"
              onClick={open} aria-label={`Заменить постер: ${movie.title}`}>
              <Pencil size={14} aria-hidden /> Заменить постер
            </button>
          )}
        />
      </div>
    </li>
  );
}

function PosterGroup({
  group, movies, onUploaded,
}: {
  group: typeof POSTER_QUALITY_GROUPS[number];
  movies: PosterQualityMovie[];
  onUploaded: () => void;
}) {
  const [limit, setLimit] = useState(20);
  const [open, setOpen] = useState(false);
  const { icon: Icon, label } = GROUP_PRESENTATION[group.id];
  return (
    <details className="poster-quality-group" data-quality={group.id} open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="focus-ring">
        <span className="poster-quality-status-icon"><Icon size={21} aria-hidden /></span>
        <div className="poster-quality-group-copy">
          <h3>{["low", "medium", "high"].includes(group.id) ? `${group.title} качество` : group.title}<span className="poster-quality-count">{movies.length}</span></h3>
          <p>{group.description}</p>
        </div>
        <span className="poster-quality-status-label">{label}</span>
        <ChevronDown size={18} className="poster-quality-chevron" aria-hidden />
      </summary>
      {open && <div className="poster-quality-group-body">{movies.length ? (
        <>
          <ul aria-label={`Постеры: ${group.title}`}>
            {movies.slice(0, limit).map((movie) => <PosterRow key={`${movie.id}:${movie.metadata?.mtimeMs}`} movie={movie} onUploaded={onUploaded} />)}
          </ul>
          {movies.length > limit && (
            <Button type="button" variant="ghost" className="mt-3" onClick={() => setLimit((current) => current + 20)}>
              Показать ещё {Math.min(20, movies.length - limit)}
            </Button>
          )}
        </>
      ) : <p className="poster-quality-empty">В этой группе нет фильмов.</p>}</div>}
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
    <SettingsSection title="Качество постеров"
      description="Найдите обложки, которые стоит заменить. Проверяем разрешение видимой области 2:3; резкость и сжатие оцените на глаз."
      action={
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void refresh(true)}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
          Обновить
        </Button>
      }>
      <div className="poster-quality-filters">
        <div className="poster-quality-search">
          <Search size={17} aria-hidden />
          <input aria-label="Найти фильм по названию" placeholder="Найти фильм…" value={query}
            onChange={(event) => setQuery(event.target.value)} className="focus-ring" type="search" />
        </div>
        <div className="poster-quality-scope">
          <Select label="Фильмы в списке постеров" value={scope} onChange={setScope}
            compact preserveOrder searchable={false}
            options={[
              { value: "CATALOG", label: "В каталоге" },
              { value: "DRAFT", label: "Черновики" },
              { value: "EXCLUDED", label: "Скрытые" },
              { value: "ALL", label: "Все фильмы" },
            ]}
          />
        </div>
      </div>
      {error && <p role="alert" className="my-4 text-sm text-danger">{error}</p>}
      {loading && <div role="status" className="poster-quality-loading-state">
        <p className="settings-help">{report ? "Проверяем изменения…" : "Читаем размеры обложек…"}</p>
        {!report && <div className="poster-quality-skeleton" aria-hidden><span /><span /><span /></div>}
      </div>}
      {report && (
        <>
          <div className="poster-quality-summary" role="status">
            <span><strong>{movies.length}</strong> фильмов</span>
            <span><strong>{attention}</strong> требуют внимания</span>
            <span><strong className="text-accent">{high}</strong> с высоким разрешением</span>
          </div>
          {movies.length === 0 ? (
            <p className="poster-quality-empty">Фильмов не найдено. Измените запрос или выберите другой список.</p>
          ) : POSTER_QUALITY_GROUPS.filter((group) => movies.some((movie) => movie.quality === group.id)).map((group) => (
            <PosterGroup key={`${group.id}:${scope}:${query}`} group={group} movies={movies.filter((movie) => movie.quality === group.id)} onUploaded={() => void refresh()} />
          ))}
          <p className="poster-quality-updated">
            Проверено {new Date(report.checkedAt).toLocaleString("ru-RU")}. После замены обложки данные обновляются автоматически.
          </p>
        </>
      )}
    </SettingsSection>
  );
}
