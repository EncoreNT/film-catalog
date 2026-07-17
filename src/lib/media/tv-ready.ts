import type { Prisma } from "@/generated/prisma/client";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

export const TV_COMPATIBLE_AUDIO_CODECS = ["ac3", "eac3", "aac"] as const;
export const TV_COMPATIBLE_VIDEO_CODECS = ["hevc", "h265", "h264", "avc"] as const;

const RUS_LANGUAGE = "rus";

export function tvReadyBadgeLabel(): string {
  return "TV";
}

export function tvReadyMarkLabel(): string {
  return "Читается телевизором";
}

export function tvReadyMarkDetail(): string {
  return "MKV · H.264/HEVC · русская AC-3/E-AC-3/AAC";
}

/** Short label for catalog filter chip. */
export function tvReadyFilterChipLabel(): string {
  return "Для телевизора";
}

export function mainRussianTrack(
  release: ReleaseWithTracks,
): ReleaseWithTracks["audioTracks"][number] | null {
  const russianTracks = release.audioTracks.filter(
    (track) => track.language === RUS_LANGUAGE,
  );
  if (russianTracks.length === 0) return null;

  const sorted = [...russianTracks].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.streamIndex - b.streamIndex;
  });
  return sorted[0] ?? null;
}

function hasTvCompatibleVideo(release: ReleaseWithTracks): boolean {
  const codec = release.videoTrack?.codec?.toLowerCase();
  if (!codec) return false;
  return (TV_COMPATIBLE_VIDEO_CODECS as readonly string[]).includes(codec);
}

function hasTvCompatibleMainRussianAudio(release: ReleaseWithTracks): boolean {
  const track = mainRussianTrack(release);
  if (!track?.codec) return false;
  return (TV_COMPATIBLE_AUDIO_CODECS as readonly string[]).includes(
    track.codec.toLowerCase(),
  );
}

export function isTvReadyRelease(release: ReleaseWithTracks): boolean {
  if (!release.filePath?.toLowerCase().endsWith(".mkv")) return false;
  if (!hasTvCompatibleVideo(release)) return false;
  return hasTvCompatibleMainRussianAudio(release);
}

/** Prisma filter — approximate superset of {@link isTvReadyRelease}. */
export function tvReadyReleaseWhere(): Prisma.ReleaseWhereInput {
  return {
    filePath: { endsWith: ".mkv" },
    videoTrack: {
      codec: { in: [...TV_COMPATIBLE_VIDEO_CODECS] },
    },
    OR: [
      {
        audioTracks: {
          some: {
            language: RUS_LANGUAGE,
            isDefault: true,
            codec: { in: [...TV_COMPATIBLE_AUDIO_CODECS] },
          },
        },
      },
      {
        AND: [
          {
            NOT: {
              audioTracks: {
                some: { language: RUS_LANGUAGE, isDefault: true },
              },
            },
          },
          {
            audioTracks: {
              some: {
                language: RUS_LANGUAGE,
                codec: { in: [...TV_COMPATIBLE_AUDIO_CODECS] },
              },
            },
          },
        ],
      },
    ],
  };
}
