import { displayFilePath } from "./display-path";
import type { MergeCandidate, MergeCandidateRelease } from "./merge-preview-types";
import { movieStatusLabel } from "./merge-preview-types";
import { pluralRu } from "./russian-plural";

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

function pathBasename(filePath: string): string {
  const display = displayFilePath(filePath);
  const parts = display.split(/[/\\]/);
  return parts[parts.length - 1] ?? display;
}

function releaseStorageLabel(release: MergeCandidateRelease): string {
  return release.storageName ?? "локальный";
}

function formatReleaseLine(release: MergeCandidateRelease): string {
  const parts = [release.label, releaseStorageLabel(release)];
  if (release.fileSizeLabel) parts.push(release.fileSizeLabel);
  if (release.filePath) {
    parts.push(truncate(pathBasename(release.filePath), 52));
  }
  return parts.join(" · ");
}

/** Distinguishing facts without the shared movie title. */
export function formatMergeCandidateFacts(candidate: MergeCandidate): string {
  const head = [movieStatusLabel[candidate.status]];

  if (candidate.rating != null) {
    head.push(`★ ${candidate.rating.toFixed(1)}`);
  }

  if (candidate.releases.length === 0) {
    head.push("без релизов");
    if (!candidate.coverUrl) head.push("без обложки");
    return head.join(" · ");
  }

  if (candidate.releases.length === 1) {
    head.push(formatReleaseLine(candidate.releases[0]!));
    return head.join(" · ");
  }

  const releaseLabels = candidate.releases.map((r) => r.label).join(" + ");
  head.push(`${candidate.releases.length} рел. · ${releaseLabels}`);

  const storages = [
    ...new Set(candidate.releases.map((r) => releaseStorageLabel(r))),
  ];
  if (storages.length === 1) {
    head.push(storages[0]!);
  } else {
    head.push(
      `${storages.length} ${pluralRu(storages.length, "диск", "диска", "дисков")}`,
    );
  }

  const withPath = candidate.releases.find((r) => r.filePath);
  if (withPath?.filePath) {
    head.push(truncate(pathBasename(withPath.filePath), 40));
  }

  return head.join(" · ");
}

/** One-line label for merge duplicate select. */
export function formatMergeCandidateSelectLabel(
  candidate: MergeCandidate,
): string {
  return `#${candidate.id} · ${formatMergeCandidateFacts(candidate)}`;
}
