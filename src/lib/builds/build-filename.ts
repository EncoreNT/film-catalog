import { dictLabel, RELEASE_TYPES, displayMovieVersionLabel } from "@/lib/shared/dictionaries";
import { sanitizeFilename, joinRuntimePath } from "@/lib/shared/display-path";

export interface BuildFilenameInput {
  movieTitle: string;
  movieYear: number | null;
  releaseType: string;
  version: string;
  resolutionLabel?: string | null;
  hdr?: string | null;
}

export function suggestBuildOutputFilename(input: BuildFilenameInput): string {
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

export function suggestBuildOutputPath(
  mediaSaveDir: string,
  input: BuildFilenameInput,
): string {
  return joinRuntimePath(mediaSaveDir, suggestBuildOutputFilename(input));
}
