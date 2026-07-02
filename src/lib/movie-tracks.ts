import type { Prisma } from "@/generated/prisma/client";
import type { ProbeResult } from "./ffprobe";

type Db = Pick<
  Prisma.TransactionClient,
  "videoTrack" | "audioTrack" | "subtitleTrack"
>;

export interface VideoTrackInput {
  streamIndex?: number;
  width?: number | null;
  height?: number | null;
  resolutionLabel?: string | null;
  codec?: string | null;
  hdr?: string | null;
  fps?: string | null;
  bitrate?: number | null;
}

export interface AudioTrackInput {
  streamIndex: number;
  codec?: string | null;
  profile?: string | null;
  channels?: number | null;
  channelLayout?: string | null;
  bitrate?: number | null;
  language?: string | null;
  translationType?: string | null;
  title?: string | null;
  isDefault?: boolean;
}

export interface SubtitleTrackInput {
  streamIndex: number;
  codec?: string | null;
  codecLabel?: string | null;
  language?: string | null;
  title?: string | null;
  isDefault?: boolean;
  forced?: boolean;
}

export interface ReleaseTracksInput {
  videoTrack?: VideoTrackInput | null;
  audioTracks?: AudioTrackInput[] | null;
  subtitleTracks?: SubtitleTrackInput[] | null;
}

/** @deprecated Use syncReleaseTracksFromProbe */
export async function syncMovieTracksFromProbe(
  db: Db,
  releaseId: number,
  probe: Pick<ProbeResult, "video" | "audio" | "subtitles">,
) {
  await syncReleaseTracksFromProbe(db, releaseId, probe);
}

/** @deprecated Use syncReleaseTracks */
export async function syncMovieTracks(
  db: Db,
  releaseId: number,
  tracks: ReleaseTracksInput,
) {
  await syncReleaseTracks(db, releaseId, tracks);
}

export async function syncReleaseTracksFromProbe(
  db: Db,
  releaseId: number,
  probe: Pick<ProbeResult, "video" | "audio" | "subtitles">,
) {
  await syncReleaseTracks(db, releaseId, {
    videoTrack: probe.video,
    audioTracks: probe.audio,
    subtitleTracks: probe.subtitles,
  });
}

export async function syncReleaseTracks(
  db: Db,
  releaseId: number,
  tracks: ReleaseTracksInput,
) {
  const { videoTrack, audioTracks, subtitleTracks } = tracks;

  if (audioTracks !== undefined || subtitleTracks !== undefined) {
    if (audioTracks !== undefined) {
      await db.audioTrack.deleteMany({ where: { releaseId } });
      if (audioTracks && audioTracks.length > 0) {
        await db.audioTrack.createMany({
          data: audioTracks.map((track) => ({
            releaseId,
            streamIndex: track.streamIndex,
            codec: track.codec ?? null,
            profile: track.profile ?? null,
            channels: track.channels ?? null,
            channelLayout: track.channelLayout ?? null,
            bitrate: track.bitrate ?? null,
            language: track.language ?? null,
            translationType: track.translationType ?? null,
            title: track.title ?? null,
            isDefault: track.isDefault ?? false,
          })),
        });
      }
    }

    if (subtitleTracks !== undefined) {
      await db.subtitleTrack.deleteMany({ where: { releaseId } });
      if (subtitleTracks && subtitleTracks.length > 0) {
        await db.subtitleTrack.createMany({
          data: subtitleTracks.map((track) => ({
            releaseId,
            streamIndex: track.streamIndex,
            codec: track.codec ?? null,
            codecLabel: track.codecLabel ?? null,
            language: track.language ?? null,
            title: track.title ?? null,
            isDefault: track.isDefault ?? false,
            forced: track.forced ?? false,
          })),
        });
      }
    }
  }

  if (videoTrack !== undefined && videoTrack !== null) {
    await db.videoTrack.upsert({
      where: { releaseId },
      create: {
        releaseId,
        streamIndex: videoTrack.streamIndex ?? 0,
        width: videoTrack.width ?? null,
        height: videoTrack.height ?? null,
        resolutionLabel: videoTrack.resolutionLabel ?? null,
        codec: videoTrack.codec ?? null,
        hdr: videoTrack.hdr ?? null,
        fps: videoTrack.fps ?? null,
        bitrate: videoTrack.bitrate ?? null,
      },
      update: {
        streamIndex: videoTrack.streamIndex,
        width: videoTrack.width,
        height: videoTrack.height,
        resolutionLabel: videoTrack.resolutionLabel,
        codec: videoTrack.codec,
        hdr: videoTrack.hdr,
        fps: videoTrack.fps,
        bitrate: videoTrack.bitrate,
      },
    });
  }
}
