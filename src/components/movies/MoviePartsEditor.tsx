"use client";

import type { MovieWithTracksAndParts } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { Checkbox } from "@/components/primitives/Checkbox";
import { Select } from "@/components/primitives/Select";
import { MultiSelect } from "@/components/primitives/MultiSelect";
import { InfoHint } from "@/components/primitives/InfoHint";
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

function resizeSlots(slots: PartReleaseSlot[], count: number): PartReleaseSlot[] {
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
  const countOptions = Array.from(
    { length: MULTIPART_MAX - MULTIPART_MIN + 1 },
    (_, i) => {
      const n = i + MULTIPART_MIN;
      return { value: String(n), label: String(n) };
    },
  );

  const allReleaseOptions = releaseOptions(releases);

  const setReleasesForPart = (partNumber: number, rawIds: string[]) => {
    const numericIds = rawIds.map((id) => parseInt(id, 10)).filter(Boolean);
    const next = releaseSlots.map((slot) => {
      if (slot.partNumber === partNumber) {
        return { ...slot, releaseIds: numericIds };
      }
      return {
        ...slot,
        releaseIds: slot.releaseIds.filter((id) => !numericIds.includes(id)),
      };
    });
    onReleaseSlotsChange(next);
  };

  const optionsForPart = (partNumber: number) => {
    const takenElsewhere = new Set(
      releaseSlots
        .filter((s) => s.partNumber !== partNumber)
        .flatMap((s) => s.releaseIds),
    );
    return allReleaseOptions.filter(
      (opt) => !takenElsewhere.has(parseInt(opt.value, 10)),
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Checkbox
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        >
          <span className="text-sm text-text">Многосерийный фильм</span>
        </Checkbox>
        <InfoHint
          label="Многосерийный фильм"
          text="Один фильм из нескольких файлов (части 1, 2, 3…). К одной серии можно привязать несколько релизов (разное качество или источник). Релиз без серии остаётся в блоке «Без серии» на карточке фильма. Обычный фильм с несколькими релизами не затрагивается, пока режим выключен."
        />
      </div>

      {enabled ? (
        <div className="space-y-4 rounded-[var(--radius-sm)] border border-border bg-bg-elevated/40 p-4">
          <Select
            label="Количество серий"
            value={String(partCount)}
            onChange={(raw) => {
              const next = Math.min(
                MULTIPART_MAX,
                Math.max(MULTIPART_MIN, parseInt(raw, 10) || MULTIPART_MIN),
              );
              onPartCountChange(next);
              onReleaseSlotsChange(resizeSlots(releaseSlots, next));
            }}
            options={countOptions}
            preserveOrder
            searchable={false}
            hint="Сколько частей у этого фильма на диске."
          />

          {releases.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">
              Пока нет релизов. Добавьте файлы на карточке фильма (скан или новый
              релиз), затем выберите их в слотах ниже.
            </p>
          ) : (
            <ul className="space-y-3" aria-label="Привязка релизов к сериям">
              {releaseSlots.map((slot) => (
                <li
                  key={slot.partNumber}
                  className="flex flex-col gap-2 rounded-[var(--radius-sm)] border border-border/80 bg-bg/50 p-3 sm:flex-row sm:gap-4"
                >
                  <div className="flex h-11 shrink-0 items-center sm:w-[5.5rem]">
                    <p className="font-mono-tech text-xs uppercase tracking-[0.12em] text-muted tabular-nums">
                      Серия {slot.partNumber}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <MultiSelect
                      label={`Релизы серии ${slot.partNumber}`}
                      placeholder="Выберите один или несколько"
                      value={slot.releaseIds.map(String)}
                      onChange={(ids) =>
                        setReleasesForPart(slot.partNumber, ids)
                      }
                      options={optionsForPart(slot.partNumber)}
                      preserveOrder
                      searchable={releases.length >= 8}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
