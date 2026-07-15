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

  const paramsCard = (
    <MachinedCard variant="calm" bodyClassName="space-y-5">
      <CardSectionHeader label="основное" title="Карточка" />
      <div className="flex flex-col gap-5">
        <CoverUpload
          layout="stacked"
          movieId={movie.id}
          hasCover={!!movie.coverPath}
          coverVersion={movie.updatedAt}
          onUploaded={() => router.refresh()}
        />
        <Field
          label="Название"
          variant="underline"
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
    </MachinedCard>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col pb-28 lg:pb-0"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-6 lg:col-span-1 lg:min-h-0 lg:overflow-y-auto lg:pr-1 scroll-subtle">
          {paramsCard}
        </div>

        <div className="flex h-full min-h-0 flex-col overflow-hidden lg:col-span-2">
          <MachinedCard
            variant="calm"
            className="flex h-full min-h-0 flex-col"
            bodyClassName="flex min-h-0 flex-1 flex-col gap-4"
          >
            <CardSectionHeader
              label="контекст"
              title="Жанры и сюжет"
              className="shrink-0"
            />
            <div className="scroll-subtle min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
              <GenrePicker
                value={genres}
                onChange={(g) => {
                  setGenres(g);
                  markDirty();
                }}
              />
              <TextAreaField
                label="Описание"
                variant="underline"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  markDirty();
                }}
                hint="Краткое описание сюжета — на твоё усмотрение."
                rows={6}
              />
              <div className="space-y-4 border-t border-border pt-6">
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
              </div>
            </div>
          </MachinedCard>
        </div>
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
