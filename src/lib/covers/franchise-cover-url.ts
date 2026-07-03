import {
  buildCoverUrl,
  type CoverVersion,
} from "@/lib/covers/cover-url";

export function franchiseCoverUrl(
  franchiseId: number,
  version: CoverVersion,
): string {
  return buildCoverUrl(`/api/franchises/${franchiseId}/cover`, version);
}

export function franchiseCoverUrlFromFranchise(franchise: {
  id: number;
  coverPath: string | null;
  updatedAt: CoverVersion;
}): string | null {
  if (!franchise.coverPath) return null;
  return franchiseCoverUrl(franchise.id, franchise.updatedAt);
}
