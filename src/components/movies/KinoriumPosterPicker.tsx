"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  ImageOff,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { apiFetch, parseApiError } from "@/lib/api/client";
import { coverExtFromMime } from "@/lib/covers/cover-formats";
import {
  kinoriumGalleryUrl,
  mergeKinoriumPosters,
  type KinoriumGallery,
  type KinoriumMovie,
  type KinoriumPoster,
} from "@/lib/covers/kinorium-types";
import "./kinorium-poster-picker.css";

interface Props {
  title?: string;
  originalTitle?: string;
  year?: number | null;
  disabled: boolean;
  onSelect: (file: File) => void;
  onBusyChange: (busy: boolean) => void;
  selectedFile: File | null;
}

function PosterImage({
  poster,
  alt,
}: {
  poster: KinoriumPoster | null;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  return poster && !failed ? (
    <Image
      src={poster.previewUrl}
      alt={alt}
      fill
      unoptimized
      sizes="150px"
      className="object-cover"
      onError={() => setFailed(true)}
    />
  ) : (
    <ImageOff size={22} aria-label="Нет предпросмотра" />
  );
}

export function KinoriumPosterPicker({
  title,
  originalTitle,
  year,
  disabled,
  onSelect,
  onBusyChange,
  selectedFile,
}: Props) {
  const [initialQuery] = useState(
    () => title?.trim() || originalTitle?.trim() || "",
  );
  const [query, setQuery] = useState(initialQuery);
  const [movies, setMovies] = useState<KinoriumMovie[]>([]);
  const [searched, setSearched] = useState(false);
  const [movie, setMovie] = useState<KinoriumMovie | null>(null);
  const [gallery, setGallery] = useState<KinoriumGallery | null>(null);
  const [loading, setLoading] = useState(false);
  const [browserLoading, setBrowserLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    url: string;
    file: File;
  } | null>(null);
  const selected = selection?.file === selectedFile ? selection?.url : null;
  const [error, setError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const imageRequest = useRef<AbortController | null>(null);

  const beginRequest = () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return controller;
  };

  const search = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (clean.length < 2) {
        setError("Введите хотя бы два символа названия.");
        return;
      }
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoading(true);
      setBrowserLoading(false);
      setError(null);
      setSearched(false);
      setMovies([]);
      setMovie(null);
      setGallery(null);
      try {
        const params = new URLSearchParams({ q: clean });
        if (year) params.set("year", String(year));
        const result = await apiFetch<{ movies: KinoriumMovie[] }>(
          `/api/covers/kinorium/search?${params}`,
          { signal: controller.signal },
          "Не удалось найти фильм.",
        );
        if (controller.signal.aborted) return;
        setMovies(result.movies);
        setSearched(true);
      } catch (error) {
        if (!controller.signal.aborted)
          setError(
            error instanceof Error ? error.message : "Не удалось найти фильм.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [year],
  );

  useEffect(() => {
    // Opening the Kinorium tab is the user's search action; no requests on page load.
    const timer = setTimeout(() => {
      if (initialQuery.length >= 2) void search(initialQuery);
    }, 0);
    return () => {
      clearTimeout(timer);
      request.current?.abort();
      imageRequest.current?.abort();
      onBusyChange(false);
    };
  }, [initialQuery, search, onBusyChange]);

  const openMovie = async (item: KinoriumMovie) => {
    const controller = beginRequest();
    setMovie(item);
    setGallery(null);
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<KinoriumGallery>(
        `/api/covers/kinorium/${item.id}`,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setGallery(result);
    } catch {
      if (!controller.signal.aborted)
        setGallery({ status: "unavailable", posters: [] });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const selectPoster = async (poster: KinoriumPoster) => {
    imageRequest.current?.abort();
    const controller = new AbortController();
    imageRequest.current = controller;
    setDownloading(poster.url);
    onBusyChange(true);
    setError(null);
    try {
      const response = await fetch(
        // Separate optimized responses from previously cached original downloads.
        `/api/covers/kinorium/image?${new URLSearchParams({ url: poster.url, v: "webp-2400-85" })}`,
        {
          signal: controller.signal,
        },
      );
      if (!response.ok)
        throw new Error(
          await parseApiError(response, "Не удалось загрузить постер."),
        );
      const blob = await response.blob();
      if (controller.signal.aborted) return;
      const file = new File(
        [blob],
        `kinorium-${movie!.id}${coverExtFromMime(blob.type) ?? ".jpg"}`,
        { type: blob.type },
      );
      onSelect(file);
      setSelection({ url: poster.url, file });
    } catch (error) {
      if (!controller.signal.aborted)
        setError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить постер.",
        );
    } finally {
      if (!controller.signal.aborted) {
        setDownloading(null);
        onBusyChange(false);
      }
    }
  };

  const openBrowser = async () => {
    if (!movie) return;
    const controller = beginRequest();
    setBrowserLoading(true);
    setError(null);
    try {
      const result = await apiFetch<KinoriumGallery>(
        `/api/covers/kinorium/${movie.id}/browser`,
        { method: "POST", signal: controller.signal },
        "Не удалось открыть галерею в браузере.",
      );
      if (!controller.signal.aborted) setGallery(result);
    } catch (error) {
      if (!controller.signal.aborted)
        setError(error instanceof Error ? error.message : "Не удалось загрузить галерею.");
    } finally {
      if (!controller.signal.aborted) setBrowserLoading(false);
    }
  };

  const busy = disabled || downloading !== null;
  const posters = mergeKinoriumPosters(
    movie?.poster ?? null,
    gallery?.posters ?? [],
  );

  return (
    <section className="kinorium-picker" aria-label="Постеры Kinorium">
      {movie ? (
        <>
          <div className="kinorium-toolbar">
            <Button
              type="button"
              variant="ghost"
              className="!px-0"
              disabled={busy}
              onClick={() => {
                request.current?.abort();
                setLoading(false);
                setBrowserLoading(false);
                setMovie(null);
                setGallery(null);
                setError(null);
              }}
            >
              <ArrowLeft size={16} aria-hidden />К фильмам
            </Button>
            <a
              className="kinorium-link focus-ring"
              href={kinoriumGalleryUrl(movie.id)}
              target="_blank"
              rel="noreferrer"
            >
              На сайте
              <ExternalLink size={14} aria-hidden />
            </a>
          </div>
          <div className="kinorium-movie-heading">
            <h3>{movie.title}</h3>
            <p>
              {[
                movie.originalTitle !== movie.title && movie.originalTitle,
                movie.year,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          <p className="kinorium-hint">
            Размеры под постерами — на сайте. Для каталога подготовим WebP до 2400
            пикселей по длинной стороне, сохранив пропорции. Небольшие изображения
            не увеличиваем.
          </p>
          {loading && (
            <p className="kinorium-status" role="status">
              <Loader2 size={16} className="animate-spin" />
              Загружаем галерею…
            </p>
          )}
          {(gallery?.status === "blocked" || gallery?.status === "unavailable") && (
            <div className="kinorium-browser-fallback">
              <p className="kinorium-notice" role="status">
                {browserLoading
                  ? "В отдельном окне Kinorium пройдите проверку, если она появится. Постеры загрузятся сюда автоматически; окно закроется. Ждём до трёх минут."
                  : "Галерея недоступна напрямую. Откройте её в отдельном окне и пройдите проверку браузера, если потребуется."}
              </p>
              {browserLoading ? (
                <Button type="button" variant="ghost" onClick={() => {
                  request.current?.abort();
                  setBrowserLoading(false);
                }}>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Отменить ожидание
                </Button>
              ) : (
                <Button type="button" variant="secondary" disabled={busy || loading}
                  onClick={() => void openBrowser()}>
                  <ExternalLink size={16} aria-hidden />
                  Загрузить через браузер
                </Button>
              )}
              {!browserLoading && (
                <p className="kinorium-hint">
                  Окно откроется на компьютере, где запущен каталог.
                </p>
              )}
            </div>
          )}
          {gallery?.status === "empty" && (
            <p className="kinorium-notice">Дополнительных постеров нет.</p>
          )}
          <div className="kinorium-posters">
            {posters.map((poster) => (
              <button
                type="button"
                key={poster.url}
                className="kinorium-poster focus-ring"
                disabled={busy}
                aria-pressed={selected === poster.url}
                aria-label={`Выбрать ${poster.id.startsWith("main-") ? "основной постер" : "постер"}${poster.width && poster.height ? ` ${poster.width} × ${poster.height}` : ""}`}
                onClick={() => void selectPoster(poster)}
              >
                <span className="kinorium-poster-image">
                  <PosterImage poster={poster} alt={movie.title} />
                  {(selected === poster.url || downloading === poster.url) && (
                    <span className="kinorium-poster-check">
                      {downloading === poster.url ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <Check size={17} />
                      )}
                    </span>
                  )}
                </span>
                <span className="kinorium-poster-size">
                  {poster.width && poster.height
                    ? `${poster.width} × ${poster.height}`
                    : "Размер не указан"}
                </span>
                <span className="kinorium-poster-kind">
                  {poster.id.startsWith("main-") ? "Основной постер" : "Постер"}
                </span>
              </button>
            ))}
          </div>
          {!loading && !posters.length && (
            <p className="kinorium-notice">
              Доступных постеров не найдено. Выберите другой фильм или загрузите
              файл.
            </p>
          )}
          {downloading && (
            <p className="kinorium-status" role="status">
              Загружаем выбранное изображение…
            </p>
          )}
          {selected &&
            !downloading &&
            posters.some((poster) => poster.url === selected) && (
              <p className="kinorium-selection-note" role="status">
                Постер в предпросмотре. Подтвердите выбор внизу окна.
              </p>
            )}
        </>
      ) : (
        <>
          <label className="kinorium-search-label" htmlFor="kinorium-query">
            Название фильма
          </label>
          <div className="kinorium-search">
            <input
              id="kinorium-query"
              className="focus-ring"
              value={query}
              maxLength={200}
              placeholder="Например, Кот в сапогах…"
              autoComplete="off"
              disabled={busy}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  void search(query);
                }
              }}
            />
            <Button
              type="button"
              onClick={() => void search(query)}
              disabled={busy || loading || query.trim().length < 2}
              aria-label="Найти фильм в Kinorium"
            >
              <Search size={17} aria-hidden />
              <span>Найти</span>
            </Button>
          </div>
          {originalTitle?.trim() && originalTitle.trim() !== title?.trim() && (
            <button
              type="button"
              className="kinorium-alternate focus-ring"
              disabled={busy || loading}
              onClick={() => {
                setQuery(originalTitle);
                void search(originalTitle);
              }}
            >
              Искать «{originalTitle}»
            </button>
          )}
          {year && (
            <p className="kinorium-hint">
              Совпадения с {year} годом показаны первыми.
            </p>
          )}
          {loading && (
            <p className="kinorium-status" role="status">
              <Loader2 size={16} className="animate-spin" />
              Ищем в Kinorium…
            </p>
          )}
          {!loading && searched && (
            <p className="kinorium-hint" role="status">
              {movies.length
                ? "Выберите фильм, чтобы посмотреть постеры."
                : "Ничего не найдено. Попробуйте оригинальное название или сократите запрос."}
            </p>
          )}
          <div className="kinorium-movies">
            {movies.map((item) => (
              <button
                type="button"
                key={item.id}
                className="kinorium-movie focus-ring"
                disabled={busy}
                onClick={() => void openMovie(item)}
              >
                <span className="kinorium-movie-image">
                  <PosterImage poster={item.poster} alt="" />
                </span>
                <span className="kinorium-movie-text">
                  <strong>{item.title}</strong>
                  {item.originalTitle !== item.title && (
                    <span>{item.originalTitle}</span>
                  )}
                  <small
                    className={item.year === year ? "text-accent" : undefined}
                  >
                    {item.year ?? "Год не указан"}
                  </small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
      {error && (
        <p className="cover-source-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
