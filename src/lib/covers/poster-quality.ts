export type PosterQuality = "low" | "medium" | "high" | "missing" | "unreadable";

export interface PosterFileMetadata {
  status: "ready" | "unreadable";
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number;
  mtimeMs: number;
  ctimeMs: number;
  checkedAt: string;
}

export const POSTER_QUALITY_GROUPS: {
  id: PosterQuality;
  title: string;
  description: string;
}[] = [
  { id: "low", title: "Низкое", description: "Меньше 600 × 900, стоит заменить" },
  { id: "medium", title: "Среднее", description: "От 600 × 900 до 1200 × 1800" },
  { id: "high", title: "Высокое", description: "От 1200 × 1800, достаточно для крупного просмотра" },
  { id: "missing", title: "Без постера", description: "Обложка не назначена или файл отсутствует" },
  { id: "unreadable", title: "Не удалось прочитать", description: "Проверьте файл или загрузите другую обложку" },
];

/** Resolution available after the same centered 2:3 crop used by movie cards. */
export function posterQuality(metadata: PosterFileMetadata | null): PosterQuality {
  if (!metadata) return "missing";
  const { width, height } = metadata;
  if (metadata.status !== "ready" || !width || !height) return "unreadable";
  const portraitWidth = Math.min(width, height * 2 / 3);
  return portraitWidth >= 1200 ? "high" : portraitWidth >= 600 ? "medium" : "low";
}

export interface PosterQualityMovie {
  id: number;
  slug: string;
  title: string;
  year: number | null;
  status: "DRAFT" | "CATALOG" | "EXCLUDED";
  coverVersion: string;
  quality: PosterQuality;
  metadata: PosterFileMetadata | null;
}

export interface PosterQualityReport {
  checkedAt: string;
  movies: PosterQualityMovie[];
}
