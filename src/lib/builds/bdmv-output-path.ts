import {
  joinRuntimePath,
  resolveRuntimePath,
  sanitizeFilename,
} from "@/lib/shared/display-path";

function runtimeParentDir(filePath: string): string {
  const normalized = resolveRuntimePath(filePath).replace(/\/+$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return normalized;
  return normalized.slice(0, lastSlash);
}

/** Default MKV next to the BDMV parent folder: `{Title} ({Year}) BDRemux.mkv`. */
export function suggestBdmvOutputPath(input: {
  movieTitle: string;
  movieYear: number | null;
  bdmvRoot: string;
}): string {
  const yearPart = input.movieYear ? ` (${input.movieYear})` : "";
  const filename = sanitizeFilename(
    `${input.movieTitle}${yearPart} BDRemux.mkv`,
  );
  return joinRuntimePath(runtimeParentDir(input.bdmvRoot), filename);
}
