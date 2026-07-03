export type MergeCandidateRelease = {
  id: number;
  label: string;
  filePath: string | null;
  storageName: string | null;
  fileSizeLabel: string | null;
};

export type MergeCandidate = {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  status: "DRAFT" | "CATALOG" | "EXCLUDED";
  rating: number | null;
  watchedAt: string | null;
  coverUrl: string | null;
  description: string | null;
  genres: string[];
  franchiseNames: string[];
  releases: MergeCandidateRelease[];
};

export const movieStatusLabel: Record<MergeCandidate["status"], string> = {
  DRAFT: "черновик",
  CATALOG: "каталог",
  EXCLUDED: "исключён",
};
