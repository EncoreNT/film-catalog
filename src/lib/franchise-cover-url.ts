type CoverVersion = Date | string | number;

function coverVersionKey(version: CoverVersion): number {
  if (typeof version === "number") return version;
  return new Date(version).getTime();
}

export function franchiseCoverUrl(
  franchiseId: number,
  version: CoverVersion,
): string {
  return `/api/franchises/${franchiseId}/cover?v=${coverVersionKey(version)}`;
}

export function franchiseCoverUrlFromFranchise(franchise: {
  id: number;
  coverPath: string | null;
  updatedAt: CoverVersion;
}): string | null {
  if (!franchise.coverPath) return null;
  return franchiseCoverUrl(franchise.id, franchise.updatedAt);
}
