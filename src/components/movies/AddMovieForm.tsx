"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives/Button";
import { Field, TextAreaField } from "@/components/primitives/Field";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { GenrePicker } from "@/components/movies/GenrePicker";
import { YearInput } from "@/components/primitives/YearInput";
import { CoverUpload } from "@/components/primitives/CoverUpload";
import { buildMovieCreatePayload } from "@/lib/movies/build-movie-payload";
import { emptyVideoFieldState } from "@/lib/movies/movie-form-types";
import { apiFetch, uploadCoverAfterCreate } from "@/lib/api/client";

export function AddMovieForm() {
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const markDirty = () => setIsDirty(true);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Укажите название");
      return;
    }

    setLoading(true);
    try {
      const payload = buildMovieCreatePayload({
        title,
        year,
        description: description.trim() || null,
        externalStorageId: null,
        releaseType: null,
        genres,
        durationSeconds: null,
        filePath: null,
        video: emptyVideoFieldState(),
        audioRows: [],
        subtitleRows: [],
      });

      const movie = await apiFetch<{ id: number; slug: string }>(
        "/api/movies",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
        "Ошибка добавления",
      );
      await uploadCoverAfterCreate(
        `/api/movies/${movie.id}/cover`,
        coverFile,
        coverUrl,
      );
      router.push(`/movies/${movie.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col pb-28 lg:pb-0"
    >
      <MachinedCard variant="calm" bodyClassName="space-y-5">
        <CardSectionHeader
          label="карточка фильма"
          title="Название, год и обложка"
        />
        <p className="text-sm text-muted">
          Файл добавите следующим шагом: готовый MKV или сборка из BDMV.
        </p>
        <div className="flex flex-col gap-5">
          <CoverUpload
            layout="stacked"
            onFileChange={(file) => {
              setCoverFile(file);
              markDirty();
            }}
            onUrlChange={(url) => {
              setCoverUrl(url);
              markDirty();
            }}
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
            placeholder="Например, Криминальное чтиво"
          />
          <YearInput
            value={year}
            onChange={(y) => {
              setYear(y);
              markDirty();
            }}
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
            variant="underline"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            placeholder="Краткое описание фильма…"
            hint="Краткое описание сюжета, на твоё усмотрение."
            rows={4}
          />
        </div>
      </MachinedCard>

      <FormActionBar
        isDirty={isDirty}
        saving={loading}
        error={error}
        idleMessage={
          !isDirty && !loading && !error
            ? "Файл добавите следующим шагом: готовый MKV или сборка из BDMV."
            : undefined
        }
      >
        <Link
          href="/"
          className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-4 py-2 text-sm font-medium text-text transition-all duration-200 hover:border-accent/50 hover:bg-bg-surface-hover hover:text-accent"
        >
          Отмена
        </Link>
        <Button type="submit" variant="primary" loading={loading}>
          Добавить фильм
        </Button>
      </FormActionBar>
    </form>
  );
}
