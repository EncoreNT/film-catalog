"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import type { MergeCandidate } from "@/lib/merge-preview-types";
import { movieStatusLabel } from "@/lib/merge-preview-types";
import { Modal } from "./primitives/Modal";
import { Button } from "./primitives/Button";
import { Radio } from "./primitives/Radio";
import { ApiCoverImage } from "./primitives/ApiCoverImage";

type FieldChoice = "canonical" | "other";

interface MergeMoviesModalProps {
  open: boolean;
  onClose: () => void;
  currentMovieId: number;
  candidates: MergeCandidate[];
  onMerged: () => void;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function formatWatchedAt(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function CandidateCard({
  candidate,
  isCanonical,
  isOther,
  isCurrentPage,
  onSelectCanonical,
}: {
  candidate: MergeCandidate;
  isCanonical: boolean;
  isOther: boolean;
  isCurrentPage: boolean;
  onSelectCanonical: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelectCanonical}
      className={`focus-ring w-full rounded-[var(--radius)] border p-3 text-left transition-colors ${
        isCanonical
          ? "border-accent bg-accent/10 shadow-[0_0_0_1px_var(--accent-glow)]"
          : isOther
            ? "border-red-400/40 bg-red-500/5"
            : "border-border bg-bg-elevated hover:border-border-strong"
      }`}
    >
      <div className="flex gap-3">
        <div className="relative h-[72px] w-12 shrink-0 overflow-hidden rounded border border-border bg-bg-surface">
          {candidate.coverUrl ? (
            <ApiCoverImage
              src={candidate.coverUrl}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-faint">
              нет
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {isCanonical ? (
              <span className="font-mono-tech rounded-full border border-accent/50 bg-accent/15 px-2 py-0.5 text-[10px] text-accent">
                каноничный
              </span>
            ) : null}
            {isOther ? (
              <span className="font-mono-tech rounded-full border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-300">
                будет удалён
              </span>
            ) : null}
            {isCurrentPage ? (
              <span className="font-mono-tech text-[10px] text-faint">
                эта страница
              </span>
            ) : null}
            <span className="font-mono-tech text-[10px] text-muted">
              {movieStatusLabel[candidate.status]}
            </span>
          </div>

          <p className="font-display text-base font-semibold leading-tight text-text">
            {candidate.title}
            {candidate.year ? (
              <span className="font-normal text-muted"> ({candidate.year})</span>
            ) : null}
          </p>

          <div className="font-mono-tech flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted">
            {candidate.rating != null ? (
              <span>★ {candidate.rating.toFixed(1)}</span>
            ) : (
              <span className="text-faint">без оценки</span>
            )}
            {candidate.watchedAt ? (
              <span>· просмотр {formatWatchedAt(candidate.watchedAt)}</span>
            ) : null}
            <span>
              · {candidate.releases.length}{" "}
              {candidate.releases.length === 1 ? "релиз" : "релиза"}
            </span>
            {candidate.coverUrl ? <span>· обложка</span> : null}
          </div>
        </div>
      </div>

      {candidate.genres.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.genres.map((g) => (
            <span
              key={g}
              className="font-mono-tech rounded-full border border-border-strong bg-bg-surface px-2 py-0.5 text-[10px] text-text"
            >
              {g}
            </span>
          ))}
        </div>
      ) : null}

      {candidate.franchiseNames.length > 0 ? (
        <p className="font-mono-tech mt-2 text-[11px] text-muted">
          франшизы: {candidate.franchiseNames.join(", ")}
        </p>
      ) : null}

      {candidate.description ? (
        <p className="mt-2 text-xs leading-relaxed text-muted">
          {truncate(candidate.description, 160)}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5 border-t border-border pt-2">
        {candidate.releases.map((release) => (
          <li
            key={release.id}
            className="font-mono-tech text-[11px] leading-snug text-text"
          >
            <span className="text-accent">{release.label}</span>
            {release.fileSizeLabel ? (
              <span className="text-muted"> · {release.fileSizeLabel}</span>
            ) : null}
            {release.storageName ? (
              <span className="text-muted"> · {release.storageName}</span>
            ) : null}
            {release.filePath ? (
              <span className="mt-0.5 block truncate text-[10px] text-faint">
                {release.filePath}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-[10px] text-faint">
        <Link
          href={`/movies/${candidate.slug}`}
          className="text-accent hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          открыть карточку
        </Link>
      </p>
    </button>
  );
}

function ConflictPicker({
  label,
  canonicalLabel,
  otherLabel,
  value,
  onChange,
}: {
  label: string;
  canonicalLabel: string;
  otherLabel: string;
  value: FieldChoice;
  onChange: (v: FieldChoice) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-mono-tech text-xs text-muted">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["canonical", canonicalLabel],
            ["other", otherLabel],
          ] as const
        ).map(([key, text]) => (
          <Radio
            key={key}
            name={label}
            checked={value === key}
            onChange={() => onChange(key)}
            className={`focus-ring w-full rounded-[var(--radius)] border px-3 py-2.5 transition-colors ${
              value === key
                ? "border-accent bg-accent/10"
                : "border-border bg-bg-elevated hover:border-border-strong"
            }`}
          >
            {text}
          </Radio>
        ))}
      </div>
    </fieldset>
  );
}

export function MergeMoviesModal({
  open,
  onClose,
  currentMovieId,
  candidates,
  onMerged,
}: MergeMoviesModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canonicalId, setCanonicalId] = useState(currentMovieId);
  const [otherId, setOtherId] = useState<number | null>(null);
  const [choices, setChoices] = useState<{
    description?: FieldChoice;
    coverPath?: FieldChoice;
    rating?: FieldChoice;
    watchedAt?: FieldChoice;
  }>({});

  useEffect(() => {
    if (!open) return;
    setCanonicalId(currentMovieId);
    const firstOther = candidates.find((c) => c.id !== currentMovieId);
    setOtherId(firstOther?.id ?? null);
    setChoices({});
    setError(null);
  }, [open, currentMovieId, candidates]);

  const canonical = candidates.find((c) => c.id === canonicalId) ?? candidates[0];
  const others = candidates.filter((c) => c.id !== canonicalId);
  const other =
    candidates.find((c) => c.id === otherId && c.id !== canonicalId) ??
    others[0] ??
    null;

  const conflicts = useMemo(() => {
    if (!canonical || !other) {
      return {
        description: false,
        coverPath: false,
        rating: false,
        watchedAt: false,
      };
    }
    return {
      description: !!canonical.description && !!other.description,
      coverPath: !!canonical.coverUrl && !!other.coverUrl,
      rating: canonical.rating != null && other.rating != null,
      watchedAt: canonical.watchedAt != null && other.watchedAt != null,
    };
  }, [canonical, other]);

  const handleCanonicalChange = (id: number) => {
    setCanonicalId(id);
    if (otherId === id) {
      const nextOther = candidates.find((c) => c.id !== id);
      setOtherId(nextOther?.id ?? null);
    }
  };

  const handleMerge = async () => {
    if (!canonical || !other) return;
    setLoading(true);
    setError(null);

    const payloadChoices: Record<string, FieldChoice> = {};
    if (conflicts.description) {
      payloadChoices.description = choices.description ?? "canonical";
    }
    if (conflicts.coverPath) {
      payloadChoices.coverPath = choices.coverPath ?? "canonical";
    }
    if (conflicts.rating) {
      payloadChoices.rating = choices.rating ?? "canonical";
    }
    if (conflicts.watchedAt) {
      payloadChoices.watchedAt = choices.watchedAt ?? "canonical";
    }

    try {
      const res = await fetch(`/api/movies/${canonical.id}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otherId: other.id,
          choices:
            Object.keys(payloadChoices).length > 0 ? payloadChoices : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось объединить");
      }
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const hasConflicts =
    conflicts.description ||
    conflicts.coverPath ||
    conflicts.rating ||
    conflicts.watchedAt;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Объединить фильмы"
      size="xwide"
      bodyClassName="max-h-[min(70vh,720px)] overflow-y-auto"
    >
      <div className="space-y-5">
        <p className="text-sm text-muted">
          Выберите, какая карточка останется каноничной. Релизы второго фильма
          перейдут под неё, файлы и треки сохранятся.
        </p>

        <div className="grid gap-3 lg:grid-cols-2">
          {candidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              isCanonical={candidate.id === canonicalId}
              isOther={other != null && candidate.id === other.id}
              isCurrentPage={candidate.id === currentMovieId}
              onSelectCanonical={() => handleCanonicalChange(candidate.id)}
            />
          ))}
        </div>

        {others.length > 1 ? (
          <div>
            <label className="font-mono-tech mb-2 block text-xs text-faint">
              объединить сейчас с
            </label>
            <select
              value={other?.id ?? ""}
              onChange={(e) => setOtherId(Number(e.target.value))}
              className="focus-ring w-full rounded-[var(--radius)] border border-border-strong bg-bg-surface px-3 py-2 text-sm text-text"
            >
              {others.map((dup) => (
                <option key={dup.id} value={dup.id}>
                  {dup.title}
                  {dup.year ? ` (${dup.year})` : ""} — {dup.releases.length} рел.
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-faint">
              Остальные дубли можно объединить повторно после этого шага.
            </p>
          </div>
        ) : null}

        {canonical && other ? (
          <div className="rounded-[var(--radius)] border border-border bg-bg-elevated p-3 text-sm">
            <p className="flex items-center gap-2 text-text">
              <Check className="h-4 w-4 text-accent" aria-hidden />
              После объединения:{" "}
              <strong>
                {canonical.releases.length + other.releases.length} релиза
              </strong>{" "}
              под «{canonical.title}»
            </p>
          </div>
        ) : null}

        {hasConflicts && canonical && other ? (
          <div className="space-y-4 rounded-[var(--radius)] border border-border-strong bg-bg-surface p-4">
            <p className="font-mono-tech text-xs text-muted">
              конфликтующие поля — выберите, что сохранить
            </p>
            {conflicts.rating ? (
              <ConflictPicker
                label="оценка"
                canonicalLabel={`★ ${canonical.rating!.toFixed(1)} (каноничный)`}
                otherLabel={`★ ${other.rating!.toFixed(1)} (удаляемый)`}
                value={choices.rating ?? "canonical"}
                onChange={(v) => setChoices((c) => ({ ...c, rating: v }))}
              />
            ) : null}
            {conflicts.watchedAt ? (
              <ConflictPicker
                label="дата просмотра"
                canonicalLabel={formatWatchedAt(canonical.watchedAt)!}
                otherLabel={formatWatchedAt(other.watchedAt)!}
                value={choices.watchedAt ?? "canonical"}
                onChange={(v) => setChoices((c) => ({ ...c, watchedAt: v }))}
              />
            ) : null}
            {conflicts.coverPath ? (
              <ConflictPicker
                label="обложка"
                canonicalLabel="обложка каноничного"
                otherLabel="обложка удаляемого"
                value={choices.coverPath ?? "canonical"}
                onChange={(v) => setChoices((c) => ({ ...c, coverPath: v }))}
              />
            ) : null}
            {conflicts.description ? (
              <ConflictPicker
                label="описание"
                canonicalLabel={truncate(canonical.description!, 80)}
                otherLabel={truncate(other.description!, 80)}
                value={choices.description ?? "canonical"}
                onChange={(v) => setChoices((c) => ({ ...c, description: v }))}
              />
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="button" onClick={handleMerge} disabled={loading || !other}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Объединение…
              </>
            ) : (
              "Объединить"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
