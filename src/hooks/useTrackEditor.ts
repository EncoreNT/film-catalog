"use client";

import { useCallback, useState } from "react";
import { normalizeAudioProfile } from "@/lib/shared/dictionaries";
import type { AudioFormRow, SubtitleFormRow } from "@/lib/movies/movie-form-types";
import {
  createAudioRowKey,
  createSubtitleRowKey,
  emptyAudioFormRow,
  emptySubtitleFormRow,
} from "@/lib/movies/movie-form-types";

interface UseTrackEditorOptions {
  initialAudio?: AudioFormRow[];
  initialSubtitles?: SubtitleFormRow[];
  defaultAudioRow?: () => AudioFormRow;
}

export function useTrackEditor(options: UseTrackEditorOptions = {}) {
  const [audioRows, setAudioRows] = useState<AudioFormRow[]>(
    options.initialAudio ?? [emptyAudioFormRow({ isDefault: true })],
  );
  const [subtitleRows, setSubtitleRows] = useState<SubtitleFormRow[]>(
    options.initialSubtitles ?? [],
  );

  const updateAudio = useCallback((index: number, patch: Partial<AudioFormRow>) => {
    setAudioRows((rows) =>
      rows.map((row, idx) => {
        if (idx !== index) return row;
        const next = { ...row, ...patch };
        if (patch.codec !== undefined) {
          next.profile = normalizeAudioProfile(patch.codec, row.profile);
        }
        return next;
      }),
    );
  }, []);

  const addAudioRow = useCallback(() => {
    const factory = options.defaultAudioRow ?? (() => emptyAudioFormRow());
    setAudioRows((rows) => [...rows, factory()]);
  }, [options.defaultAudioRow]);

  const removeAudioRow = useCallback((index: number) => {
    setAudioRows((rows) => rows.filter((_, idx) => idx !== index));
  }, []);

  const setMainAudioTrack = useCallback((index: number) => {
    setAudioRows((rows) =>
      rows.map((row, idx) => ({
        ...row,
        isDefault: idx === index ? !row.isDefault : false,
      })),
    );
  }, []);

  const updateSubtitle = useCallback(
    (index: number, patch: Partial<SubtitleFormRow>) => {
      setSubtitleRows((rows) =>
        rows.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
      );
    },
    [],
  );

  const addSubtitleRow = useCallback(() => {
    setSubtitleRows((rows) => [...rows, emptySubtitleFormRow()]);
  }, []);

  const removeSubtitleRow = useCallback((index: number) => {
    setSubtitleRows((rows) => rows.filter((_, idx) => idx !== index));
  }, []);

  const setAudioRowsFromProbe = useCallback((rows: AudioFormRow[]) => {
    setAudioRows(
      rows.map((row) => ({
        ...row,
        rowKey: row.rowKey || createAudioRowKey(),
      })),
    );
  }, []);

  const setSubtitleRowsFromProbe = useCallback((rows: SubtitleFormRow[]) => {
    setSubtitleRows(
      rows.map((row) => ({
        ...row,
        rowKey: row.rowKey || createSubtitleRowKey(),
      })),
    );
  }, []);

  return {
    audioRows,
    subtitleRows,
    updateAudio,
    addAudioRow,
    removeAudioRow,
    setMainAudioTrack,
    updateSubtitle,
    addSubtitleRow,
    removeSubtitleRow,
    setAudioRowsFromProbe,
    setSubtitleRowsFromProbe,
  };
}
