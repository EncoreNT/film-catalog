import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { parseMkvIdentifyJson, type MkvTrackInfo } from "@/lib/builds/build-inspection";
import { parseMpls } from "@/lib/media/bdmv/mpls-parse";
import {
  resolveBdmvRoot,
  type BdmvWarning,
} from "@/lib/media/bdmv/bdmv-root";
import { assertWslDriveMounted } from "@/lib/shared/wsl-drive-mount";

export const MAIN_PLAYLIST_MIN_SECONDS = 40 * 60;

export interface BdmvPlaylistSummary {
  path: string;
  fileName: string;
  durationSeconds: number | null;
  estimatedBytes: number;
  clipCount: number;
  missingClips: string[];
  likelyMain: boolean;
}

export interface BdmvInspectTrack {
  id: number;
  type: "video" | "audio" | "subtitle";
  codec: string | null;
  language: string | null;
  name: string | null;
  defaultTrack: boolean;
  forcedTrack: boolean;
  channels: number | null;
}

export interface BdmvInspectSelected {
  path: string;
  tracks: {
    video: BdmvInspectTrack[];
    audio: BdmvInspectTrack[];
    subtitles: BdmvInspectTrack[];
  };
  durationSeconds: number | null;
}

export interface BdmvInspectResult {
  bdmvRoot: string;
  playlistDir: string;
  streamDir: string;
  playlists: BdmvPlaylistSummary[];
  selected: BdmvInspectSelected | null;
  warnings: BdmvWarning[];
}

function mapIdentifyTrack(track: MkvTrackInfo): BdmvInspectTrack {
  const type: BdmvInspectTrack["type"] =
    track.type === "subtitles" ? "subtitle" : track.type === "audio" ? "audio" : "video";
  return {
    id: track.id,
    type,
    codec: track.codec,
    language: track.properties?.language ?? null,
    name: track.properties?.track_name ?? null,
    defaultTrack: Boolean(track.properties?.default_track),
    forcedTrack: Boolean(track.properties?.forced_track),
    channels: track.properties?.audio_channels ?? null,
  };
}

function groupInspectTracks(tracks: MkvTrackInfo[]): BdmvInspectSelected["tracks"] {
  const mapped = tracks.map(mapIdentifyTrack);
  return {
    video: mapped.filter((t) => t.type === "video"),
    audio: mapped.filter((t) => t.type === "audio"),
    subtitles: mapped.filter((t) => t.type === "subtitle"),
  };
}

async function listMplsFiles(playlistDir: string): Promise<string[]> {
  const entries = await readdir(playlistDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mpls"))
    .map((entry) => path.join(playlistDir, entry.name))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

async function clipFileBytes(streamDir: string, clipId: string): Promise<number | null> {
  const candidates = [`${clipId}.m2ts`, `${clipId}.M2TS`];
  for (const name of candidates) {
    const full = path.join(streamDir, name);
    try {
      const info = await stat(full);
      if (info.isFile()) return info.size;
    } catch {
      // try next casing
    }
  }
  try {
    const entries = await readdir(streamDir);
    const hit = entries.find(
      (name) => name.toLowerCase() === `${clipId.toLowerCase()}.m2ts`,
    );
    if (!hit) return null;
    const info = await stat(path.join(streamDir, hit));
    return info.isFile() ? info.size : null;
  } catch {
    return null;
  }
}

async function summarizePlaylist(
  playlistPath: string,
  streamDir: string,
): Promise<BdmvPlaylistSummary | { warning: BdmvWarning }> {
  let buffer: Buffer;
  try {
    buffer = await readFile(playlistPath);
  } catch {
    return {
      warning: {
        code: "playlist-unreadable",
        message: `Не удалось прочитать ${path.basename(playlistPath)}`,
      },
    };
  }
  try {
    const parsed = parseMpls(buffer);
    const missingClips: string[] = [];
    let estimatedBytes = 0;
    for (const clipId of parsed.clips) {
      const size = await clipFileBytes(streamDir, clipId);
      if (size == null) missingClips.push(`${clipId}.m2ts`);
      else estimatedBytes += size;
    }
    return {
      path: playlistPath,
      fileName: path.basename(playlistPath),
      durationSeconds: parsed.durationSeconds,
      estimatedBytes,
      clipCount: parsed.clips.length,
      missingClips,
      likelyMain: false,
    };
  } catch {
    return {
      warning: {
        code: "playlist-parse-failed",
        message: `Не удалось разобрать ${path.basename(playlistPath)}`,
      },
    };
  }
}

function markLikelyMain(playlists: BdmvPlaylistSummary[]): BdmvPlaylistSummary[] {
  if (playlists.length === 0) return playlists;
  const sorted = [...playlists].sort((a, b) => {
    const dur = (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
    if (dur !== 0) return dur;
    return a.fileName.localeCompare(b.fileName);
  });
  const longEnough = sorted.filter(
    (p) => (p.durationSeconds ?? 0) >= MAIN_PLAYLIST_MIN_SECONDS,
  );
  const main = (longEnough[0] ?? sorted[0])!;
  return playlists.map((p) => ({ ...p, likelyMain: p.path === main.path }));
}

async function identifyPlaylist(
  playlistPath: string,
): Promise<{ tracks: MkvTrackInfo[]; durationSeconds: number | null; warning?: BdmvWarning }> {
  try {
    const { stdout } = await execa("mkvmerge", ["-J", playlistPath], {
      timeout: 60_000,
    });
    const identified = parseMkvIdentifyJson(stdout);
    return {
      tracks: identified.tracks,
      durationSeconds: identified.container.duration,
    };
  } catch {
    return {
      tracks: [],
      durationSeconds: null,
      warning: {
        code: "identify-failed",
        message: "mkvmerge не смог прочитать выбранный плейлист",
      },
    };
  }
}

export async function inspectBdmv(
  bdmvPath: string,
  playlistPath?: string,
): Promise<BdmvInspectResult> {
  await assertWslDriveMounted(bdmvPath);
  const resolved = await resolveBdmvRoot(bdmvPath);
  const warnings = [...resolved.warnings];

  const mplsFiles = await listMplsFiles(resolved.playlistDir);
  if (mplsFiles.length === 0) {
    throw new Error("Не похоже на Blu-ray: нет плейлистов");
  }

  const playlists: BdmvPlaylistSummary[] = [];
  for (const filePath of mplsFiles) {
    const result = await summarizePlaylist(filePath, resolved.streamDir);
    if ("warning" in result) {
      warnings.push(result.warning);
      continue;
    }
    playlists.push(result);
  }

  if (playlists.length === 0) {
    throw new Error("Не похоже на Blu-ray: нет плейлистов");
  }

  const marked = markLikelyMain(playlists);
  marked.sort((a, b) => {
    const dur = (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
    if (dur !== 0) return dur;
    return a.fileName.localeCompare(b.fileName);
  });

  const allShort = marked.every(
    (p) => (p.durationSeconds ?? 0) < MAIN_PLAYLIST_MIN_SECONDS,
  );
  if (allShort) {
    warnings.push({
      code: "short-playlists",
      message: "Все плейлисты короче 40 минут. Похоже на доп. материалы.",
    });
  }

  const requested = playlistPath
    ? marked.find((p) => p.path === playlistPath)
    : null;
  const selectedSummary = requested ?? marked.find((p) => p.likelyMain) ?? marked[0]!;

  if (selectedSummary.missingClips.length > 0) {
    warnings.push({
      code: "missing-clips",
      message: `В STREAM нет клипов: ${selectedSummary.missingClips.join(", ")}`,
    });
  }

  const identified = await identifyPlaylist(selectedSummary.path);
  if (identified.warning) warnings.push(identified.warning);

  return {
    bdmvRoot: resolved.bdmvRoot,
    playlistDir: resolved.playlistDir,
    streamDir: resolved.streamDir,
    playlists: marked,
    selected: {
      path: selectedSummary.path,
      tracks: groupInspectTracks(identified.tracks),
      durationSeconds: identified.durationSeconds ?? selectedSummary.durationSeconds,
    },
    warnings,
  };
}
