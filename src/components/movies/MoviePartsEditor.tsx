"use client";

import { useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Modal } from "@/components/primitives/Modal";
import { Button } from "@/components/primitives/Button";
import "./movie-parts-editor.css";
import type { MovieWithTracksAndParts } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { Checkbox } from "@/components/primitives/Checkbox";
import { releasePickerLabel } from "@/lib/releases/release-picker-label";

export const MULTIPART_MIN = 2;
export const MULTIPART_MAX = 20;

export interface PartReleaseSlot {
  partNumber: number;
  releaseIds: number[];
}

interface MovieMultipartSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  partCount: number;
  onPartCountChange: (count: number) => void;
  releaseSlots: PartReleaseSlot[];
  onReleaseSlotsChange: (slots: PartReleaseSlot[]) => void;
  releases: ReleaseWithTracks[];
}

export function isMultipartMovie(movie: {
  partCount: number | null;
  parts?: { partNumber: number }[];
}): boolean {
  return (
    (movie.partCount != null && movie.partCount > 1) ||
    (movie.parts?.length ?? 0) > 1
  );
}

export function initialMultipartPartCount(movie: {
  partCount: number | null;
  parts?: { partNumber: number }[];
}): number {
  if (movie.partCount != null && movie.partCount > 1) return movie.partCount;
  const fromParts = movie.parts?.length ?? 0;
  if (fromParts > 1) return fromParts;
  return MULTIPART_MIN;
}

export function initialPartReleaseSlots(
  movie: MovieWithTracksAndParts,
): PartReleaseSlot[] {
  const count = initialMultipartPartCount(movie);
  if (!isMultipartMovie(movie)) return [];

  const idsByPart = new Map<number, number[]>();

  for (const part of movie.parts ?? []) {
    const ids = part.releases.map((r) => r.id);
    if (ids.length) idsByPart.set(part.partNumber, ids);
  }

  for (const release of movie.releases) {
    if (release.moviePartId == null) continue;
    const part = movie.parts?.find((p) => p.id === release.moviePartId);
    if (!part) continue;
    const list = idsByPart.get(part.partNumber) ?? [];
    if (!list.includes(release.id)) {
      idsByPart.set(part.partNumber, [...list, release.id]);
    }
  }

  return Array.from({ length: count }, (_, i) => {
    const partNumber = i + 1;
    return {
      partNumber,
      releaseIds: idsByPart.get(partNumber) ?? [],
    };
  });
}

export function partsPayloadFromSlots(
  slots: PartReleaseSlot[],
): { partNumber: number; title: string | null }[] {
  return slots.map((slot) => ({
    partNumber: slot.partNumber,
    title: null,
  }));
}

export function partReleaseLinksPayload(
  slots: PartReleaseSlot[],
): { partNumber: number; releaseIds: number[] }[] {
  return slots.map((slot) => ({
    partNumber: slot.partNumber,
    releaseIds: slot.releaseIds,
  }));
}

function resizeSlots(
  slots: PartReleaseSlot[],
  count: number,
): PartReleaseSlot[] {
  return Array.from({ length: count }, (_, i) => {
    const partNumber = i + 1;
    const existing = slots.find((s) => s.partNumber === partNumber);
    return existing ?? { partNumber, releaseIds: [] };
  });
}

function releaseOptions(releases: ReleaseWithTracks[]) {
  return releases.map((release) => ({
    value: String(release.id),
    label: releasePickerLabel(release),
  }));
}

export function MovieMultipartSection({
  enabled,
  onEnabledChange,
  partCount,
  onPartCountChange,
  releaseSlots,
  onReleaseSlotsChange,
  releases,
}: MovieMultipartSectionProps) {
  const sectionId = useId();
  const [activePart, setActivePart] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const allReleaseOptions = releaseOptions(releases);
  const selectedSlot = releaseSlots.find(
    (slot) => slot.partNumber === activePart,
  );
  const selectedIds = selectedSlot?.releaseIds ?? [];

  const changeCount = (count: number) => {
    const next = Math.min(MULTIPART_MAX, Math.max(MULTIPART_MIN, count));
    onPartCountChange(next);
    onReleaseSlotsChange(resizeSlots(releaseSlots, next));
  };
  const toggleRelease = (id: number) => {
    onReleaseSlotsChange(
      releaseSlots.map((slot) =>
        slot.partNumber === activePart
          ? {
              ...slot,
              releaseIds: slot.releaseIds.includes(id)
                ? slot.releaseIds.filter((value) => value !== id)
                : [...slot.releaseIds, id],
            }
          : slot,
      ),
    );
  };
  const closePicker = () => {
    setActivePart(null);
    setQuery("");
  };

  return (
    <div className="movie-parts-editor">
      <Checkbox
        checked={enabled}
        aria-controls={sectionId}
        aria-expanded={enabled}
        className="movie-parts-toggle"
        onChange={(event) => onEnabledChange(event.target.checked)}
      >
        Многосерийный фильм
      </Checkbox>
      {enabled && (
        <div id={sectionId} className="movie-parts-content">
          <div className="movie-parts-heading">
            <div>
              <h2>Серии фильма</h2>
              <p>
                Один фильм из нескольких серий. Продолжения и приквелы
                добавляйте во франшизу.
              </p>
            </div>
            <div className="movie-parts-count">
              <label htmlFor={`${sectionId}-count`}>Количество серий</label>
              <div>
                <button
                  type="button"
                  className="focus-ring"
                  aria-label="Уменьшить количество серий"
                  disabled={partCount <= MULTIPART_MIN}
                  onClick={() => changeCount(partCount - 1)}
                >
                  <Minus size={17} aria-hidden />
                </button>
                <select
                  id={`${sectionId}-count`}
                  className="focus-ring"
                  value={partCount}
                  onChange={(event) => changeCount(Number(event.target.value))}
                >
                  {Array.from(
                    { length: MULTIPART_MAX - MULTIPART_MIN + 1 },
                    (_, i) => i + MULTIPART_MIN,
                  ).map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="focus-ring"
                  aria-label="Увеличить количество серий"
                  disabled={partCount >= MULTIPART_MAX}
                  onClick={() => changeCount(partCount + 1)}
                >
                  <Plus size={17} aria-hidden />
                </button>
              </div>
            </div>
          </div>
          {releases.length === 0 ? (
            <p className="movie-parts-empty">
              После добавления файлов на странице фильма здесь можно будет
              распределить релизы по сериям.
            </p>
          ) : (
            <>
              <p className="movie-parts-hint">
                У серии может быть несколько релизов. Непривязанные файлы
                останутся в разделе «Без серии».
              </p>
              <ul
                className="movie-parts-list"
                aria-label="Привязка релизов к сериям"
              >
                {releaseSlots.map((slot) => (
                  <li key={slot.partNumber}>
                    <span className="movie-parts-number" aria-hidden>
                      {String(slot.partNumber).padStart(2, "0")}
                    </span>
                    <div className="movie-parts-summary">
                      <h3>Серия {slot.partNumber}</h3>
                      {slot.releaseIds.length ? (
                        <ul>
                          {slot.releaseIds.map((id) => (
                            <li key={id}>
                              {allReleaseOptions.find(
                                (option) => option.value === String(id),
                              )?.label ?? `Релиз ${id}`}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Релизы ещё не выбраны</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Выбрать релизы серии ${slot.partNumber}`}
                      onClick={() => {
                        setActivePart(slot.partNumber);
                        setQuery("");
                      }}
                    >
                      {slot.releaseIds.length ? "Изменить" : "Выбрать релизы"}
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      <Modal
        open={activePart != null && enabled}
        onClose={closePicker}
        title={`Релизы серии ${activePart}`}
        size="wide"
        bodyClassName="movie-parts-dialog"
        footer={
          <>
            <span className="movie-parts-save-note">
              Привязки сохранятся вместе с фильмом.
            </span>
            <Button type="button" variant="primary" onClick={closePicker}>
              Готово
            </Button>
          </>
        }
      >
        <p className="movie-parts-hint">
          Выберите один или несколько вариантов качества для этой серии.
        </p>
        {releases.length >= 8 && (
          <input
            className="movie-parts-search focus-ring"
            aria-label="Найти релиз"
            placeholder="Название файла или качество"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
          />
        )}
        <div className="movie-parts-options">
          {allReleaseOptions
            .filter((option) =>
              option.label
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()),
            )
            .map((option) => {
              const id = Number(option.value);
              const otherPart = releaseSlots.find(
                (slot) =>
                  slot.partNumber !== activePart &&
                  slot.releaseIds.includes(id),
              );
              return (
                <Checkbox
                  key={id}
                  checked={selectedIds.includes(id)}
                  disabled={!!otherPart}
                  onChange={() => toggleRelease(id)}
                >
                  <span className="movie-parts-option-label">
                    {option.label}
                  </span>
                  {otherPart && (
                    <span className="movie-parts-option-note">
                      Уже в серии {otherPart.partNumber}
                    </span>
                  )}
                </Checkbox>
              );
            })}
          {allReleaseOptions.every(
            (option) =>
              !option.label
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()),
          ) && <p className="movie-parts-hint">Ничего не найдено</p>}
        </div>
      </Modal>
    </div>
  );
}
