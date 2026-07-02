"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, EyeOff, Loader2, Trash2 } from "lucide-react";
import type { MovieWithTracks } from "@/lib/movie-query";
import { Button } from "./primitives/Button";
import { ConfirmDialog } from "./primitives/ConfirmDialog";
import { Field, TextAreaField } from "./primitives/Field";
import { DatePicker } from "./primitives/DatePicker";
import { StarRating } from "./StarRating";
import { MovieFranchisePicker } from "./MovieFranchisePicker";
import type { MovieFranchiseMembership } from "@/lib/movie-franchise-memberships";
import { orderedMovieGenres } from "@/lib/movie-genres";
import { GenrePicker } from "./GenrePicker";
import { YearInput } from "./primitives/YearInput";
import { CoverUpload } from "./primitives/CoverUpload";
import { buildMovieUpdatePayload } from "@/lib/build-movie-payload";

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
  const [rating, setRating] = useState<number | null>(movie.rating);
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
      const movieRes = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          buildMovieUpdatePayload({
            title,
            year,
            description,
            genres,
            rating,
            watchedAt,
          }),
        ),
      });
      if (!movieRes.ok) {
        const data = await movieRes.json();
        throw new Error(data.error ?? "Ошибка сохранения");
      }
      const updated = (await movieRes.json()) as MovieWithTracks;
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
      await fetch(`/api/movies/${movie.id}/approve`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleHide = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/movies/${movie.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EXCLUDED" }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось скрыть фильм");
      }
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
      const res = await fetch(`/api/movies/${movie.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Не удалось удалить фильм");
      }
      setConfirmKind(null);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-28">
      <div className="surface-card mx-auto max-w-2xl space-y-6 p-5">
        <h2 className="font-display text-xl font-semibold">Карточка фильма</h2>

        <div className="flex items-start gap-3">
          <CoverUpload
            movieId={movie.id}
            hasCover={!!movie.coverPath}
            coverVersion={movie.updatedAt}
            onUploaded={() => router.refresh()}
          />
          <div className="min-w-0 flex-1">
            <Field
              label="Название"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                markDirty();
              }}
              required
            />
          </div>
        </div>

        <YearInput
          value={year}
          onChange={(y) => {
            setYear(y);
            markDirty();
          }}
          hint="Год выхода фильма, от 1888 до текущего+1."
        />

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

        <MovieFranchisePicker
          movieId={movie.id}
          movieTitle={movie.title}
          initialMemberships={franchiseMemberships ?? []}
        />

        <div className="space-y-2">
          <p className="text-sm text-muted">Оценка</p>
          <StarRating
            value={rating}
            onChange={(r) => {
              setRating(r);
              markDirty();
            }}
          />
        </div>

        <DatePicker
          label="Дата просмотра"
          value={watchedAt}
          onChange={(d) => {
            setWatchedAt(d);
            markDirty();
          }}
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-bg-deep/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">сохранение…</span>
              </>
            ) : error ? (
              <span className="truncate text-sm text-danger" role="alert">
                {error}
              </span>
            ) : isDirty ? (
              <>
                <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow)]" aria-hidden />
                <span className="font-mono-tech text-sm text-accent">несохранённые изменения</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4 shrink-0 text-accent/70" aria-hidden />
                <span className="font-mono-tech text-sm text-muted">все изменения сохранены</span>
              </>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
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
          </div>
        </div>
      </div>

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
