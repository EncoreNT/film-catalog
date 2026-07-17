import path from "node:path";
import {
  dictLabel,
  RELEASE_TYPES,
  displayMovieVersionLabel,
} from "@/lib/shared/dictionaries";
import { sanitizeFilename, joinRuntimePath } from "@/lib/shared/display-path";
import type { BuildRecipeTrackState } from "@/lib/builds/build-recipe-state";

export interface BuildFilenameMetadataInput {
  movieTitle: string;
  movieYear: number | null;
  releaseType: string;
  version: string;
  resolutionLabel?: string | null;
  hdr?: string | null;
}

export interface BuildOutputSuggestInput extends BuildFilenameMetadataInput {
  tracks: BuildRecipeTrackState[];
  releases: ReleaseLookup[];
}

type ReleaseLookup = {
  id: number;
  filePath: string | null;
  audioTracks: Array<{ streamIndex: number; language: string | null }>;
};

function stemFromFilePath(filePath: string): string {
  const base = path.posix.basename(filePath.replace(/\\/g, "/"));
  const parsed = path.posix.parse(base);
  return sanitizeFilename(parsed.name || base);
}

function dedupeTokens(tokens: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const key = token.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(token);
  }
  return out;
}

/**
 * Suffix tokens derived from recipe vs straight remux of the video source:
 * - mux — дорожки из нескольких релизов
 * - eac3 / ac3 + 51 / 20 — перекодированное аудио
 * - dual — keepOriginal при transcode
 * - eng, rus, … — аудио с другого релиза, чем видео
 */
export function buildRecipeFilenameTokens(
  tracks: BuildRecipeTrackState[],
  releases: ReleaseLookup[],
): string[] {
  const video = tracks.find((t) => t.kind === "video");
  if (!video) return [];

  const videoReleaseId = video.sourceReleaseId;
  const sourceIds = new Set(tracks.map((t) => t.sourceReleaseId));
  const tokens: string[] = [];

  if (sourceIds.size > 1) {
    tokens.push("mux");
  }

  let hasDual = false;
  const transcodeTokens: string[] = [];

  for (const track of tracks) {
    if (track.kind !== "audio") continue;

    if (track.sourceReleaseId !== videoReleaseId) {
      const release = releases.find((r) => r.id === track.sourceReleaseId);
      const audio = release?.audioTracks.find(
        (a) => a.streamIndex === track.sourceStreamIndex,
      );
      const lang = audio?.language?.trim().toLowerCase();
      if (lang && lang !== "und") {
        tokens.push(lang);
      }
    }

    if (track.audioMode === "transcode") {
      const codec = track.transcodeCodec ?? "eac3";
      transcodeTokens.push(codec === "ac3" ? "ac3" : "eac3");
      if (track.channelTarget === "stereo") {
        transcodeTokens.push("20");
      } else if (track.channelTarget === "up_to_51") {
        transcodeTokens.push("51");
      }
      if (track.keepOriginal) {
        hasDual = true;
      }
    }
  }

  tokens.push(...dedupeTokens(transcodeTokens));
  if (hasDual) tokens.push("dual");

  return dedupeTokens(tokens);
}

export function appendRecipeTokensToStem(stem: string, tokens: string[]): string {
  if (tokens.length === 0) return stem;
  const stemLower = stem.toLowerCase();
  const novel = tokens.filter((t) => !stemLower.includes(t.toLowerCase()));
  if (novel.length === 0) return stem;
  return sanitizeFilename(`${stem}.${novel.join(".")}`);
}

export function suggestBuildOutputFilenameFromMetadata(
  input: BuildFilenameMetadataInput,
): string {
  const yearPart = input.movieYear ? ` (${input.movieYear})` : "";
  const releaseLabel = dictLabel(RELEASE_TYPES, input.releaseType);
  const releasePart = releaseLabel ? ` [${releaseLabel}]` : "";
  const version = displayMovieVersionLabel(input.version);
  const versionPart = version ? ` ${version}` : "";
  const specParts = [
    input.resolutionLabel && input.resolutionLabel !== "other"
      ? input.resolutionLabel
      : null,
    input.hdr && input.hdr !== "SDR" ? input.hdr : null,
  ].filter(Boolean);
  const specPart = specParts.length ? ` ${specParts.join(" ")}` : "";
  return sanitizeFilename(
    `${input.movieTitle}${yearPart}${releasePart}${versionPart}${specPart}.mkv`,
  );
}

export function suggestBuildOutputFilename(input: BuildOutputSuggestInput): string {
  const video = input.tracks.find((t) => t.kind === "video");
  const videoRelease = video
    ? input.releases.find((r) => r.id === video.sourceReleaseId)
    : null;
  const sourcePath = videoRelease?.filePath?.trim();

  let stem: string;
  if (sourcePath) {
    stem = stemFromFilePath(sourcePath);
    const tokens = buildRecipeFilenameTokens(input.tracks, input.releases);
    stem = appendRecipeTokensToStem(stem, tokens);
  } else {
    stem = suggestBuildOutputFilenameFromMetadata(input).replace(/\.mkv$/i, "");
  }

  return sanitizeFilename(
    stem.toLowerCase().endsWith(".mkv") ? stem : `${stem}.mkv`,
  );
}

export function suggestBuildOutputPath(input: BuildOutputSuggestInput): string | null {
  const video = input.tracks.find((t) => t.kind === "video");
  const videoRelease = video
    ? input.releases.find((r) => r.id === video.sourceReleaseId)
    : null;
  const sourcePath = videoRelease?.filePath?.trim();
  if (!sourcePath) return null;

  const dir = path.posix.dirname(sourcePath.replace(/\\/g, "/"));
  const filename = suggestBuildOutputFilename(input);
  return joinRuntimePath(dir, filename);
}

/** @deprecated Use BuildOutputSuggestInput — kept for narrow metadata-only callers. */
export type BuildFilenameInput = BuildFilenameMetadataInput;
