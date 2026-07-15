"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Trash2 } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movies/movie-query";
import { Button } from "@/components/primitives/Button";
import { ConfirmDialog } from "@/components/primitives/ConfirmDialog";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { Field, TextAreaField } from "@/components/primitives/Field";
import { DatePicker } from "@/components/primitives/DatePicker";
import { InfoHint } from "@/components/primitives/InfoHint";
import { MovieFranchisePicker } from "@/components/franchises/MovieFranchisePicker";
import type { MovieFranchiseMembership } from "@/lib/movies/movie-franchise-memberships";
import { orderedMovieGenres } from "@/lib/movies/movie-genres";
import { GenrePicker } from "@/components/movies/GenrePicker";
import { YearInput } from "@/components/primitives/YearInput";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { buildMovieUpdatePayload } from "@/lib/movies/build-movie-payload";
import { apiFetch, approveMovie } from "@/lib/api/client";

interface MovieEditorProps {
  movie: MovieWithTracks;
  franchiseMemberships?: MovieFranchiseMembership[];
}

export function MovieEditor({ movie, franchiseMemberships }: MovieEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmKind, setConfirmKind] = useState<null | "hide" | "delete">(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [title, setTitle] = useState(movie.title);
  const [year, setYear] = useState<number | null>(movie.year ?? null);
  const [description, setDescription] = useState(movie.description ?? "");
  const [genres, setGenres] = useState<string[]>(
    orderedMovieGenres(movie).map((g) => g.name),
  );
  const [watchedAt, setWatchedAt] = useState(
    movie.watchedAt
      ? new Date(movie.watchedAt).toISOString().slice(0, 10)
      : "",
  );

  const markDirty = () => setIsDirty(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const updated = await apiFetch<MovieWithTracks>(
        `/api/movies/${movie.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildMovieUpdatePayload({
              title,
              year,
              description,
              genres,
              rating: movie.rating,
              watchedAt,
            }),
          ),
        },
        "Ошибка сохранения",
      );
      setIsDirty(false);
      if (updated.slug !== movie.slug) {
        router.replace(`/movies/${updated.slug}/edit`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
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
    <form onSubmit={handleSubmit} className="pb-28">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start lg:gap-8">
        <MachinedCard variant="calm" bodyClassName="space-y-5">
          <CardSectionHeader label="карточка" title="Параметры фильма" />

          <div className="grid gap-6 sm:grid-cols-[112px_minmax(0,1fr)] sm:items-start">
            <CoverUpload
              movieId={movie.id}
              hasCover={!!movie.coverPath}
              coverVersion={movie.updatedAt}
              onUploaded={() => router.refresh()}
            />
            <div className="min-w-0 space-y-4">
              <Field
                label="Название"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                required
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <YearInput
                  value={year}
                  onChange={(y) => {
                    setYear(y);
                    markDirty();
                  }}
                  hint="Год выхода, 1888 — текущий+1."
                />
                <DatePicker
                  label="Дата просмотра"
                  value={watchedAt}
                  onChange={(d) => {
                    setWatchedAt(d);
                    markDirty();
                  }}
                />
              </div>
            </div>
          </div>

          <GenrePicker
            value={genres}
            onChange={(g) => {
              setGenres(g);
              markDirty();
            }}
          />

          <TextAreaField
            label="Описание"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            hint="Краткое описание сюжета — на твоё усмотрение."
          />
        </MachinedCard>

        <MachinedCard variant="calm" bodyClassName="space-y-4 lg:sticky lg:top-24">
          <CardSectionHeader
            label="связи"
            title="Франшизы"
            trailing={
              <InfoHint
                label="Франшизы"
                text="Привяжите фильм к одной или нескольким франшизам и выберите слот. Новую франшизу можно создать прямо отсюда."
              />
            }
          />
          <MovieFranchisePicker
            embedded
            movieId={movie.id}
            movieTitle={movie.title}
            initialMemberships={franchiseMemberships ?? []}
          />
        </MachinedCard>
      </div>

      <FormActionBar
        isDirty={isDirty}
        saving={loading}
        actionLoading={actionLoading}
        error={error}
      >
        {movie.status === "DRAFT" ? (
          <Button
            type="button"
            variant="secondary"
            loading={loading}
            onClick={handleApprove}
          >
            В каталог
          </Button>
        ) : null}
        {movie.status !== "EXCLUDED" ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmKind("hide")}
            disabled={loading || actionLoading}
          >
            <EyeOff className="h-4 w-4" aria-hidden />
            Скрыть
          </Button>
        ) : null}
        <Button
          type="button"
          variant="danger"
          onClick={() => setConfirmKind("delete")}
          disabled={loading || actionLoading}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Удалить
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={!isDirty && !loading}
        >
          Сохранить
        </Button>
      </FormActionBar>

      <ConfirmDialog
        open={confirmKind === "hide"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleHide}
        loading={actionLoading}
        title="Скрыть фильм из каталога?"
        description="Фильм пропадёт из каталога, но останется в базе — его можно будет вернуть. Текущие несохранённые правки не будут сохранены."
        confirmLabel="Скрыть"
      />
      <ConfirmDialog
        open={confirmKind === "delete"}
        onClose={() => setConfirmKind(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Удалить фильм безвозвратно?"
        description="Фильм и все его релизы будут удалены из базы навсегда. Это действие нельзя отменить. Текущие несохранённые правки будут потеряны."
        confirmLabel="Удалить навсегда"
      />
    </form>
  );
}
