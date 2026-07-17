/** Whether a build recipe needs ffmpeg audio transcode (vs mux/copy only). */
export function recipeRequiresTranscode(
  tracks: ReadonlyArray<{ kind: string; audioMode?: string | null }>,
): boolean {
  return tracks.some(
    (track) =>
      track.kind.toLowerCase() === "audio" &&
      (track.audioMode ?? "copy").toLowerCase() === "transcode",
  );
}

/** Whether persisted build tracks include a transcode step. */
export function buildTracksRequireTranscode(
  tracks: ReadonlyArray<{ kind: string; audioMode?: string | null }>,
): boolean {
  return recipeRequiresTranscode(tracks);
}
