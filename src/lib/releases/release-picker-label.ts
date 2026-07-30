import type { ReleaseWithTracks } from "@/lib/movies/movie-include";
import { releaseTabLabel } from "@/lib/media/release-tags";
import { displayFilePath } from "@/lib/shared/display-path";

function basenameFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const i = normalized.lastIndexOf("/");
  return i >= 0 ? normalized.slice(i + 1) : normalized;
}

/** Select option label: specs + file name (for duplicate release types). */
export function releasePickerLabel(release: ReleaseWithTracks): string {
  const spec = releaseTabLabel(release);
  const raw = release.filePath?.trim();
  if (!raw) return spec;
  const name = basenameFromPath(displayFilePath(raw));
  return name ? `${spec} - ${name}` : spec;
}
