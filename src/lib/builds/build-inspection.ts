import path from "path";

export interface MkvTrackInfo {
  id: number;
  type: "video" | "audio" | "subtitles";
  codec: string | null;
  properties?: {
    language?: string;
    track_name?: string;
    default_track?: boolean;
    forced_track?: boolean;
    audio_channels?: number;
  };
}

export interface MkvIdentifyResult {
  container: { duration: number | null };
  tracks: MkvTrackInfo[];
  attachments?: { id: number; content_type?: string; file_name?: string }[];
}

export function parseMkvIdentifyJson(stdout: string): MkvIdentifyResult {
  const data = JSON.parse(stdout) as {
    container?: { properties?: { duration?: number } };
    tracks?: {
      id: number;
      type: string;
      codec?: string;
      properties?: MkvTrackInfo["properties"];
    }[];
    attachments?: { id: number; content_type?: string; file_name?: string }[];
  };

  const durationNs = data.container?.properties?.duration;
  const durationSeconds =
    durationNs != null && durationNs > 0 ? durationNs / 1_000_000_000 : null;

  const tracks: MkvTrackInfo[] = (data.tracks ?? []).map((track) => ({
    id: track.id,
    type: track.type as MkvTrackInfo["type"],
    codec: track.codec ?? null,
    properties: track.properties,
  }));

  return {
    container: { duration: durationSeconds },
    tracks,
    attachments: data.attachments,
  };
}

export function mapFfprobeStreamToMkvTrackId(
  tracks: MkvTrackInfo[],
  kind: "video" | "audio" | "subtitle",
  ffprobeStreamIndex: number,
): number | null {
  const mkvType = kind === "subtitle" ? "subtitles" : kind;
  const candidates = tracks.filter((t) => t.type === mkvType);
  if (candidates.length === 0) return null;

  const streamsOfKind = tracks
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => t.type === mkvType);

  // Build ffprobe-like ordering: we need external ffprobe data for accurate mapping.
  // Fallback: use position among mkv tracks of same type by sorted id.
  const sorted = [...streamsOfKind].sort((a, b) => a.t.id - b.t.id);
  const targetOrdinal = ffprobeStreamIndex; // caller passes type-specific ordinal when possible

  if (targetOrdinal >= 0 && targetOrdinal < sorted.length) {
    return sorted[targetOrdinal]!.t.id;
  }
  return sorted[0]?.t.id ?? null;
}

export function resolveMkvTrackIdByOrdinal(
  tracks: MkvTrackInfo[],
  kind: "video" | "audio" | "subtitle",
  ordinalAmongType: number,
): number | null {
  const mkvType = kind === "subtitle" ? "subtitles" : kind;
  const ofType = tracks
    .filter((t) => t.type === mkvType)
    .sort((a, b) => a.id - b.id);
  return ofType[ordinalAmongType]?.id ?? null;
}

export function ffprobeOrdinalAmongType(
  streams: { index: number; codec_type?: string }[],
  streamIndex: number,
  kind: "video" | "audio" | "subtitle",
): number {
  const codecType = kind === "subtitle" ? "subtitle" : kind;
  const ofType = streams
    .filter((s) => s.codec_type === codecType)
    .sort((a, b) => a.index - b.index);
  return ofType.findIndex((s) => s.index === streamIndex);
}

export function normalizeOutputPath(outputPath: string): string {
  const trimmed = outputPath.trim();
  if (!path.isAbsolute(trimmed)) {
    throw new Error("Путь результата должен быть абсолютным");
  }
  if (!trimmed.toLowerCase().endsWith(".mkv")) {
    throw new Error("Результат должен быть файлом .mkv");
  }
  return trimmed;
}

export function buildPartPath(outputPath: string, jobId: number): string {
  const dir = path.dirname(outputPath);
  const base = path.basename(outputPath, ".mkv");
  return path.join(dir, `.${base}.${jobId}.part.mkv`);
}
