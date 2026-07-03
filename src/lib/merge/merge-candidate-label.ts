import { displayFilePath } from "@/lib/shared/display-path";
import type { MergeCandidate, MergeCandidateRelease } from "@/lib/merge/merge-preview-types";
import { movieStatusLabel } from "@/lib/merge/merge-preview-types";
import { releaseStorageLabel } from "@/lib/releases/release-storage";
import { formatCountRu } from "@/lib/shared/russian-plural";
import { truncate } from "@/lib/shared/text-trim";

function pathBasename(filePath: string): string {
  const display = displayFilePath(filePath);
  const parts = display.split(/[/\\]/);
  return parts[parts.length - 1] ?? display;
}

function mergeReleaseStorageLabel(release: MergeCandidateRelease): string {
  return (
    releaseStorageLabel({
      externalStorage: release.storageName
        ? { name: release.storageName }
        : null,
      filePath: release.filePath,
    }) ?? "локальный"
  );
}

function formatReleaseLine(release: MergeCandidateRelease): string {
  const parts = [release.label, mergeReleaseStorageLabel(release)];
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
    ...new Set(candidate.releases.map((r) => mergeReleaseStorageLabel(r))),
  ];
  if (storages.length === 1) {
    head.push(storages[0]!);
  } else {
    head.push(formatCountRu(storages.length, ["диск", "диска", "дисков"]));
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
