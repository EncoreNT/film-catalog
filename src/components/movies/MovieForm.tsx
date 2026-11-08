"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  EyeOff,
  PencilLine,
  GitFork,
  Library,
  Save,
  Trash2,
} from "lucide-react";
import type { MovieWithTracksAndParts } from "@/lib/movies/movie-include";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { TextAreaField } from "@/components/primitives/Field";
import { MovieFranchisePicker } from "@/components/franchises/MovieFranchisePicker";
import { MovieRemakePicker } from "@/components/remakes/MovieRemakePicker";
import type { MovieFranchiseMembership } from "@/lib/movies/movie-franchise-memberships";
import type { MovieRemakeMembership } from "@/lib/remakes/remake-membership";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { GenrePicker } from "@/components/movies/GenrePicker";
import {
  MovieMultipartSection,
  initialMultipartPartCount,
  initialPartReleaseSlots,
  isMultipartMovie,
  partsPayloadFromSlots,
  partReleaseLinksPayload,
  type PartReleaseSlot,
} from "@/components/movies/MoviePartsEditor";
import { YearInput } from "@/components/primitives/YearInput";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import {
  buildMovieCreatePayload,
  buildMovieUpdatePayload,
} from "@/lib/movies/build-movie-payload";
import { apiFetch, approveMovie, uploadCover } from "@/lib/api/client";
import { emptyVideoFieldState } from "@/lib/movies/movie-form-types";
import "./movie-editor.css";

import type { GenrePopularity } from "@/lib/movies/genre-picker-options";

interface MovieFormProps {
  genrePopularity: GenrePopularity[];
  movie?: MovieWithTracksAndParts;
  franchiseMemberships?: MovieFranchiseMembership[];
  remakeMemberships?: MovieRemakeMembership[];
}

export function MovieForm({
  genrePopularity,
  movie,
  franchiseMemberships,
  remakeMemberships,
}: MovieFormProps) {
  const router = useRouter();
  const nextDestination = useRef<"connections" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "hide" | "delete">(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const [initialTitle, ...initialOtherTitles] = (movie?.title ?? "")
    .trim()
    .split(" / ");
  const [title, setTitle] = useState(initialTitle);
  const [originalTitle, setOriginalTitle] = useState(
    initialOtherTitles.join(" / "),
  );
  const fullTitle = [title.trim(), originalTitle.trim()]
    .filter(Boolean)
    .join(" / ");
  const [year, setYear] = useState<number | null>(movie?.year ?? null);
  const [description, setDescription] = useState(movie?.description ?? "");
  const [genres, setGenres] = useState<string[]>(
    movie ? orderedMovieGenres(movie).map((g) => g.name) : [],
  );
  const [multipartEnabled, setMultipartEnabled] = useState(() =>
    movie ? isMultipartMovie(movie) : false,
  );
  const [partCount, setPartCount] = useState(() =>
    movie ? initialMultipartPartCount(movie) : 2,
  );
  const [releaseSlots, setReleaseSlots] = useState<PartReleaseSlot[]>(() =>
    movie && isMultipartMovie(movie) ? initialPartReleaseSlots(movie) : [],
  );

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // Keep the created identity if the subsequent cover upload fails. Retrying
  // updates this card instead of creating a duplicate movie.
  const [createdMovie, setCreatedMovie] = useState<{
    id: number;
    slug: string;
  } | null>(null);
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const backHref = movie ? `/movies/${movie.slug}` : "/";
  const markDirty = () => {
    setIsDirty(true);
    setSaved(false);
  };

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading || actionLoading) return;
    setError(null);
    const next = nextDestination.current;
    nextDestination.current = null;
    if (!title.trim()) {
      setError("Укажите название фильма");
      return;
    }
    setLoading(true);
    try {
      const update = buildMovieUpdatePayload({
        title: fullTitle,
        year,
        description,
        genres,
        partCount: multipartEnabled ? partCount : null,
        parts: multipartEnabled ? partsPayloadFromSlots(releaseSlots) : [],
        partReleaseLinks: multipartEnabled
          ? partReleaseLinksPayload(releaseSlots)
          : [],
      });
      const existing = movie ?? createdMovie;
      const payload = existing
        ? update
        : {
            ...buildMovieCreatePayload({
              title: fullTitle,
              year,
              description,
              genres,
              externalStorageId: null,
              releaseType: null,
              durationSeconds: null,
              filePath: null,
              video: emptyVideoFieldState(),
              audioRows: [],
              subtitleRows: [],
            }),
            partCount: update.partCount,
            parts: update.parts,
          };
      const updated = await apiFetch<{ id: number; slug: string }>(
        existing ? `/api/movies/${existing.id}` : "/api/movies",
        {
          method: existing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Не удалось сохранить фильм",
      );
      if (!movie) {
        setCreatedMovie(updated);
        try {
          if (coverFile)
            await uploadCover(`/api/movies/${updated.id}/cover`, {
              kind: "file",
              file: coverFile,
            });
          else if (coverUrl)
            await uploadCover(`/api/movies/${updated.id}/cover`, {
              kind: "url",
              url: coverUrl,
            });
        } catch {
          setError(
            "Карточка создана, но обложка не загрузилась. Выберите другую обложку или повторите сохранение.",
          );
          return;
        }
      }
      setIsDirty(false);
      setSaved(true);
      if (!movie)
        router.push(
          `/movies/${updated.slug}${next === "connections" ? "/edit#movie-connections" : ""}`,
        );
      else if (updated.slug !== movie.slug)
        router.replace(`/movies/${updated.slug}/edit`);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!movie) return;
    setLoading(true);
    try {
      await approveMovie(movie.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    if (!movie) return;
    setActionLoading(true);
    try {
      await apiFetch(
        `/api/movies/${movie.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "EXCLUDED" }),
        },
        "Не удалось скрыть фильм",
      );
      setConfirmKind(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!movie) return;
    setActionLoading(true);
    try {
      await apiFetch(
        `/api/movies/${movie.id}`,
        { method: "DELETE" },
        "Не удалось удалить фильм",
      );
      setConfirmKind(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="movie-editor-page">
      <div className="movie-editor-topline">
        <Link
          href={backHref}
          className="focus-ring movie-editor-back"
          onClick={(event) => {
            if (loading || actionLoading) {
              event.preventDefault();
              return;
            }
            if (
              isDirty &&
              !event.ctrlKey &&
              !event.metaKey &&
              !event.shiftKey &&
              !event.altKey
            ) {
              event.preventDefault();
              setLeaveHref(backHref);
            }
          }}
        >
          <ArrowLeft size={16} aria-hidden /> {movie ? "К фильму" : "В каталог"}
        </Link>
        <span className="movie-editor-status">
          <span aria-hidden />
          {movie
            ? movie.status === "CATALOG"
              ? "В каталоге"
              : movie.status === "DRAFT"
                ? "Черновик"
                : "Скрыт из каталога"
            : "Новая карточка"}
        </span>
      </div>
      <h1 className="sr-only">
        {movie ? "Редактирование фильма" : "Новый фильм"}
      </h1>

      <fieldset
        disabled={loading || actionLoading}
        className="movie-editor-grid"
        aria-label="Карточка фильма"
      >
        <aside
          className="movie-editor-poster-column"
          aria-label="Постер фильма"
        >
          <div className="movie-editor-poster">
            <CoverUpload
              layout="poster"
              movieId={movie?.id}
              hasCover={!!movie?.coverPath}
              coverVersion={movie?.updatedAt}
              onUploaded={() => router.refresh()}
              onFileChange={(file) => {
                setCoverFile(file);
                markDirty();
              }}
              onUrlChange={(url) => {
                setCoverUrl(url);
                markDirty();
              }}
            />
          </div>
          <p className="movie-editor-poster-note">
            Файл, ссылка или изображение из буфера.
            {movie
              ? " Обложка сохраняется отдельно."
              : " Обложку можно добавить позже."}
          </p>
        </aside>

        <div className="movie-editor-main">
          <section className="movie-editor-identity" aria-label="О фильме">
            <div className="movie-editor-mode">
              <PencilLine size={15} aria-hidden />
              {movie ? "Редактирование фильма" : "Новый фильм"}
            </div>
            <div className="movie-editor-titles">
              <TextAreaField
                label="Название"
                variant="underline"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value.replace(/\n/g, " "));
                  markDirty();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
                required
                placeholder="Название фильма"
                rows={1}
                className="movie-editor-title-input"
              />
              <TextAreaField
                label="Оригинальное название"
                variant="underline"
                value={originalTitle}
                onChange={(e) => {
                  setOriginalTitle(e.target.value.replace(/\n/g, " "));
                  markDirty();
                }}
                placeholder="На языке оригинала"
                rows={1}
                className="movie-editor-original-input"
              />
            </div>
            <div className="movie-editor-year-line">
              <YearInput
                id="movie-year"
                label="Год выхода"
                minYear={1900}
                maxYear={2100}
                value={year}
                onChange={(value) => {
                  setYear(value);
                  markDirty();
                }}
              />
            </div>
            <GenrePicker
              popularity={genrePopularity}
              value={genres}
              onChange={(g) => {
                setGenres(g);
                markDirty();
              }}
            />
            <div className="movie-editor-synopsis">
              <TextAreaField
                label="Сюжет"
                variant="underline"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                placeholder="О чём этот фильм…"
                rows={4}
                className="movie-editor-description"
              />
            </div>
          </section>
          <section
            id="movie-connections"
            className="movie-editor-connections"
            aria-label="Связи фильма"
          >
            <div className="movie-editor-connections-heading">
              <h2>Связи фильма</h2>
              <p className="movie-editor-note">
                {movie
                  ? "Связи сохраняются сразу, отдельно от полей карточки."
                  : "Сначала создайте карточку, затем выберите франшизу или свяжите экранизации."}
              </p>
            </div>
            <div className="movie-editor-relations-grid">
              <div className="movie-editor-relation">
                <div className="movie-editor-relation-title">
                  <Library size={20} aria-hidden />
                  <h3>Франшизы</h3>
                </div>
                <p className="movie-editor-note">
                  Общая история или вселенная. Выберите место фильма среди
                  продолжений и приквелов.
                </p>
                {movie ? (
                  <MovieFranchisePicker
                    embedded
                    movieId={movie.id}
                    movieTitle={movie.title}
                    initialMemberships={franchiseMemberships ?? []}
                  />
                ) : (
                  <p className="movie-editor-example">
                    Например, «Властелин колец»
                  </p>
                )}
              </div>
              <div className="movie-editor-relation">
                <div className="movie-editor-relation-title">
                  <GitFork size={20} aria-hidden />
                  <h3>Ремейки и экранизации</h3>
                </div>
                <p className="movie-editor-note">
                  Разные экранизации одного произведения. Укажите роль:
                  оригинал, ремейк или переосмысление.
                </p>
                {movie ? (
                  <MovieRemakePicker
                    embedded
                    movieId={movie.id}
                    initialMemberships={remakeMemberships ?? []}
                  />
                ) : (
                  <p className="movie-editor-example">
                    Например, экранизации «Дюны»
                  </p>
                )}
              </div>
            </div>
            {!movie ? (
              <Button
                type="button"
                variant="secondary"
                loading={loading}
                onClick={(event) => {
                  const form = event.currentTarget.form;
                  if (form?.reportValidity()) {
                    nextDestination.current = "connections";
                    form.requestSubmit();
                  }
                }}
              >
                Создать и настроить связи <ArrowRight size={16} aria-hidden />
              </Button>
            ) : null}
          </section>
          <section
            className="movie-editor-structure"
            aria-label="Многосерийность"
          >
            <MovieMultipartSection
              enabled={multipartEnabled}
              onEnabledChange={(next) => {
                setMultipartEnabled(next);
                if (next) {
                  const count = Math.max(partCount, 2);
                  setPartCount(count);
                  if (releaseSlots.length < count) {
                    setReleaseSlots(
                      Array.from({ length: count }, (_, i) => {
                        const partNumber = i + 1;
                        const existing = releaseSlots.find(
                          (s) => s.partNumber === partNumber,
                        );
                        return existing ?? { partNumber, releaseIds: [] };
                      }),
                    );
                  }
                }
                markDirty();
              }}
              partCount={partCount}
              onPartCountChange={(count) => {
                setPartCount(count);
                markDirty();
              }}
              releaseSlots={releaseSlots}
              onReleaseSlotsChange={(slots) => {
                setReleaseSlots(slots);
                markDirty();
              }}
              releases={movie?.releases ?? []}
            />
          </section>
        </div>
      </fieldset>

      <FormActionBar
        isDirty={isDirty}
        saving={loading}
        actionLoading={actionLoading}
        error={error}
        secondaryActions={
          movie ? (
            <div
              className="movie-editor-management-actions"
              role="group"
              aria-label="Управление карточкой"
            >
              {movie.status !== "CATALOG" && (
                <Button
                  type="button"
                  variant="ghost"
                  loading={loading}
                  disabled={isDirty || actionLoading}
                  title={
                    isDirty
                      ? "Сохраните изменения перед возвращением фильма в каталог"
                      : undefined
                  }
                  onClick={handleApprove}
                >
                  {movie.status === "DRAFT" ? "В каталог" : "Вернуть в каталог"}
                </Button>
              )}
              {movie.status !== "EXCLUDED" && (
                <Button
                  type="button"
                  variant="ghost"
                  aria-label="Скрыть из каталога"
                  onClick={() => setConfirmKind("hide")}
                  disabled={loading || actionLoading}
                >
                  <EyeOff size={16} aria-hidden /> Скрыть
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                aria-label="Удалить фильм"
                className="movie-editor-delete"
                onClick={() => setConfirmKind("delete")}
                disabled={loading || actionLoading}
              >
                <Trash2 size={16} aria-hidden /> Удалить
              </Button>
            </div>
          ) : undefined
        }
        idleMessage={
          !movie && !isDirty
            ? "Достаточно названия, остальное можно заполнить позже"
            : saved
              ? "Изменения сохранены"
              : movie && !isDirty
                ? "Нет несохранённых изменений"
                : undefined
        }
      >
        <Button
          type="button"
          variant="ghost"
          disabled={loading || actionLoading}
          onClick={() => {
            if (isDirty) setLeaveHref(backHref);
            else router.push(backHref);
          }}
        >
          {movie ? "К фильму" : "Отмена"}
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={actionLoading || (!!movie && !isDirty)}
        >
          <Save size={16} aria-hidden />
          {movie
            ? "Сохранить изменения"
            : createdMovie
              ? "Повторить сохранение"
              : "Создать фильм"}
        </Button>
      </FormActionBar>
      <ConfirmDialog
        open={leaveHref != null}
        onClose={() => setLeaveHref(null)}
        onConfirm={() => {
          setIsDirty(false);
          router.push(leaveHref ?? backHref);
        }}
        title="Выйти без сохранения?"
        description="Несохранённые изменения полей будут потеряны. Уже сохранённые обложка и связи останутся."
        confirmLabel="Выйти без сохранения"
      />
      <ConfirmDialog
        open={confirmKind === "hide"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleHide}
        loading={actionLoading}
        title="Скрыть фильм из каталога?"
        description="Фильм останется в базе, его можно будет вернуть. Несохранённые правки полей будут потеряны."
        confirmLabel="Скрыть"
      />
      <ConfirmDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Удалить фильм безвозвратно?"
        description="Фильм и все его релизы будут удалены из базы. Это действие нельзя отменить."
        confirmLabel="Удалить навсегда"
      />
    </form>
  );
}
