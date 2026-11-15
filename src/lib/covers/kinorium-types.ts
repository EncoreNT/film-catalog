export interface KinoriumPoster {
  id: string;
  previewUrl: string;
  url: string;
  width: number | null;
  height: number | null;
}

export interface KinoriumMovie {
  id: number;
  title: string;
  originalTitle: string;
  year: number | null;
  poster: KinoriumPoster | null;
}

export interface KinoriumGallery {
  status: "available" | "empty" | "blocked" | "unavailable";
  posters: KinoriumPoster[];
}

export function kinoriumGalleryUrl(id: number): string {
  return `https://ru.kinorium.com/${id}/gallery/poster/`;
}

/** The main poster remains usable even when Kinorium blocks its gallery. */
export function mergeKinoriumPosters(
  main: KinoriumPoster | null,
  gallery: KinoriumPoster[],
): KinoriumPoster[] {
  const seen = new Set<string>();
  return [...(main ? [main] : []), ...gallery].filter((poster) => {
    if (seen.has(poster.url)) return false;
    seen.add(poster.url);
    return true;
  });
}
