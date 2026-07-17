import type { z } from "zod";
import type { buildRecipeSchema } from "@/lib/api/validators/build";
import type { InspectedReleaseFile } from "@/lib/builds/build-inspect-runtime";
import type { BuildWarning } from "@/lib/builds/build-inspect-runtime";
import type { BuildTrackKind } from "@/lib/builds/build-recipe-state";
import { channelTargetLabel } from "@/lib/builds/build-presets";
import {
  resolveFfmpegAudioOrdinal,
  resolveInspectedAudioTrack,
  resolveInspectedGlobalStreamIndex,
  resolveInspectedMkvTrackId,
  resolveInspectedSubtitleTrack,
} from "@/lib/builds/build-track-inspect";

type BuildRecipe = z.infer<typeof buildRecipeSchema>;

export interface BuildTrackMappingPreviewRow {
  trackIndex: number;
  kind: BuildTrackKind;
  label: string;
  catalogStreamIndex: number;
  sourceReleaseId: number;
  action: "copy" | "transcode";
  actionLabel: string;
  resolvedTitle: string | null;
  resolvedCodec: string | null;
  ffprobeGlobalIndex: number | null;
  mkvTrackId: number | null;
  /** ffmpeg `-map` selector for transcode step, e.g. `0:a:0`. */
  ffmpegMap: string | null;
}

function normalizeTitle(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLocaleLowerCase("ru") : null;
}

function actionLabelForTrack(
  track: BuildRecipe["tracks"][number],
): { action: "copy" | "transcode"; label: string } {
  const kind = track.kind;
  if (kind === "video" || kind === "subtitle") {
    return { action: "copy", label: "Копирование" };
  }
  if (track.audioMode === "transcode") {
    const parts: string[] = [];
    if (track.transcodeCodec) parts.push(track.transcodeCodec.toUpperCase());
    if (track.transcodeBitrate != null) parts.push(String(track.transcodeBitrate));
    if (track.channelTarget === "stereo") {
      parts.push(channelTargetLabel("stereo"));
    } else if (track.channelTarget === "up_to_51") {
      parts.push(channelTargetLabel("up_to_51"));
    }
    return {
      action: "transcode",
      label: parts.length > 0 ? `→ ${parts.join(" · ")}` : "Перекодирование",
    };
  }
  return { action: "copy", label: "Копирование" };
}

function resolveProbedTrack(
  inspected: InspectedReleaseFile,
  kind: BuildTrackKind,
  sourceStreamIndex: number,
) {
  if (kind === "audio") {
    return resolveInspectedAudioTrack(inspected, sourceStreamIndex);
  }
  if (kind === "subtitle") {
    return resolveInspectedSubtitleTrack(inspected, sourceStreamIndex);
  }
  return inspected.probe.video;
}

export function buildRecipeMappingPreview(
  recipe: BuildRecipe,
  inspected: Map<number, InspectedReleaseFile>,
): BuildTrackMappingPreviewRow[] {
  return recipe.tracks.map((track, trackIndex) => {
    const kind = track.kind;
    const info = inspected.get(track.sourceReleaseId);
    const { action, label: actionLabel } = actionLabelForTrack(track);

    if (!info) {
      return {
        trackIndex,
        kind,
        label: track.label?.trim() || `${kind} #${track.sourceStreamIndex}`,
        catalogStreamIndex: track.sourceStreamIndex,
        sourceReleaseId: track.sourceReleaseId,
        action,
        actionLabel,
        resolvedTitle: null,
        resolvedCodec: null,
        ffprobeGlobalIndex: null,
        mkvTrackId: null,
        ffmpegMap: null,
      };
    }

    const globalIndex = resolveInspectedGlobalStreamIndex(
      info,
      kind,
      track.sourceStreamIndex,
    );
    const mkvTrackId = resolveInspectedMkvTrackId(
      info,
      kind,
      track.sourceStreamIndex,
    );
    const probed = resolveProbedTrack(info, kind, track.sourceStreamIndex);
    const resolvedTitle =
      probed && "title" in probed ? (probed.title as string | null) : kind === "video" ? "Видео" : null;

    let ffmpegMap: string | null = null;
    if (kind === "audio" && track.audioMode === "transcode" && globalIndex != null) {
      try {
        const ordinal = resolveFfmpegAudioOrdinal(info, track.sourceStreamIndex);
        ffmpegMap = `0:a:${ordinal}`;
      } catch {
        ffmpegMap = null;
      }
    }

    return {
      trackIndex,
      kind,
      label: track.label?.trim() || `${kind} #${track.sourceStreamIndex}`,
      catalogStreamIndex: track.sourceStreamIndex,
      sourceReleaseId: track.sourceReleaseId,
      action,
      actionLabel,
      resolvedTitle,
      resolvedCodec:
        probed && "codec" in probed ? (probed.codec as string | null) : null,
      ffprobeGlobalIndex: globalIndex,
      mkvTrackId,
      ffmpegMap,
    };
  });
}

export function mappingPreviewValidationErrors(
  preview: BuildTrackMappingPreviewRow[],
  recipe: BuildRecipe,
): BuildWarning[] {
  const errors: BuildWarning[] = [];

  const copyMkvByRelease = new Map<string, BuildTrackMappingPreviewRow[]>();

  for (const row of preview) {
    const recipeTrack = recipe.tracks[row.trackIndex];
    if (!recipeTrack) continue;

    const expectedTitle = normalizeTitle(recipeTrack.label);
    const resolvedTitle = normalizeTitle(row.resolvedTitle);
    if (
      expectedTitle &&
      resolvedTitle &&
      expectedTitle !== resolvedTitle &&
      row.kind !== "video"
    ) {
      errors.push({
        code: "mapping_title_mismatch",
        message: `«${row.label}»: в файле будет взята дорожка «${row.resolvedTitle}» (ffprobe ${row.ffprobeGlobalIndex ?? "?"}, mkv ${row.mkvTrackId ?? "?"})`,
        severity: "error",
        details: {
          trackIndex: row.trackIndex,
          catalogStreamIndex: row.catalogStreamIndex,
          expectedTitle: recipeTrack.label,
          resolvedTitle: row.resolvedTitle,
        },
      });
    }

    if (row.mkvTrackId == null || row.ffprobeGlobalIndex == null) continue;
    if (row.kind === "video") continue;
    if (row.action === "transcode") continue;

    const key = `${row.sourceReleaseId}:${row.kind}:${row.mkvTrackId}`;
    const bucket = copyMkvByRelease.get(key) ?? [];
    bucket.push(row);
    copyMkvByRelease.set(key, bucket);
  }

  for (const [, rows] of copyMkvByRelease) {
    if (rows.length < 2) continue;
    const names = rows.map((row) => `«${row.label}»`).join(" и ");
    const mkvId = rows[0]?.mkvTrackId;
    errors.push({
      code: "mapping_duplicate_mkv",
      message: `${names} сопоставлены с одним потоком mkv (id ${mkvId})`,
      severity: "error",
      details: { mkvTrackId: mkvId, trackIndexes: rows.map((row) => row.trackIndex) },
    });
  }

  return errors;
}
