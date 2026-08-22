import { execa } from "execa";
import { getResolutionLabel } from "@/lib/shared/resolution";
import { enrichProbedAudioTracks } from "@/lib/media/enrich-probe-audio";
import {
  dedupeDefaultAudioTracks,
  framesHaveHdr10Plus,
  parseAudioStream,
  parseDurationSeconds,
  parseFps,
  parseSubtitleStream,
  resolveProbedHdr,
  shouldProbeHdr10PlusFrames,
  streamBitrateKbps,
  type FfprobeFrame,
  type FfprobeOutput,
  type FfprobeStream,
  type ProbeResult,
  type ProbedAudioTrack,
  type ProbedHdr,
  type ProbedSubtitleTrack,
  type ProbedVideoTrack,
} from "@/lib/media/ffprobe-parse";

export type {
  ProbeResult,
  ProbedAudioTrack,
  ProbedSubtitleTrack,
  ProbedVideoTrack,
  FfprobeStream,
} from "@/lib/media/ffprobe-parse";

export { detectVideoHdr, resolveProbedHdr } from "@/lib/media/ffprobe-parse";

async function probeHdr10PlusFrames(
  filePath: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const { stdout } = await execa(
    "ffprobe",
    [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_frames",
      "-select_streams",
      "v:0",
      "-read_intervals",
      "%+#2",
      filePath,
    ],
    { cancelSignal: signal },
  );
  const data = JSON.parse(stdout) as { frames?: FfprobeFrame[] };
  return framesHaveHdr10Plus(data.frames ?? []);
}

export async function probeVideoHdr(
  filePath: string,
  videoStream: FfprobeStream,
  signal?: AbortSignal,
): Promise<ProbedHdr> {
  let frameHasHdr10Plus = false;
  if (shouldProbeHdr10PlusFrames(videoStream)) {
    try {
      frameHasHdr10Plus = await probeHdr10PlusFrames(filePath, signal);
    } catch {
      frameHasHdr10Plus = false;
    }
  }
  return resolveProbedHdr(videoStream, frameHasHdr10Plus);
}

export async function probeMediaFile(
  filePath: string,
  signal?: AbortSignal,
): Promise<ProbeResult> {
  const { stdout } = await execa(
    "ffprobe",
    [
      "-v",
      "quiet",
      "-print_format",
      "json",
      "-show_streams",
      "-show_format",
      filePath,
    ],
    { cancelSignal: signal },
  );

  const data = JSON.parse(stdout) as FfprobeOutput;
  const streams = data.streams ?? [];

  const isAttachedPic = (s: FfprobeStream) =>
    s.disposition?.attached_pic === 1;

  const videoStream = streams.find(
    (s) => s.codec_type === "video" && !isAttachedPic(s),
  );
  const audioStreams = streams.filter((s) => s.codec_type === "audio");
  const subtitleStreams = streams.filter((s) => s.codec_type === "subtitle");

  let video: ProbedVideoTrack | null = null;
  if (videoStream) {
    const width = videoStream.width ?? null;
    const height = videoStream.height ?? null;
    const probedHdr = await probeVideoHdr(filePath, videoStream, signal);
    video = {
      streamIndex: videoStream.index,
      width,
      height,
      resolutionLabel: getResolutionLabel(width, height),
      codec: videoStream.codec_name ?? null,
      hdr: probedHdr.hdr,
      hasHdr10Plus: probedHdr.hasHdr10Plus,
      fps: parseFps(videoStream),
      bitrate: streamBitrateKbps(videoStream),
    };
  }

  const audio: ProbedAudioTrack[] = enrichProbedAudioTracks(
    audioStreams.map(parseAudioStream),
  );
  dedupeDefaultAudioTracks(audio);

  const subtitles: ProbedSubtitleTrack[] =
    subtitleStreams.map(parseSubtitleStream);

  return {
    durationSeconds: parseDurationSeconds(data.format, streams),
    video,
    audio,
    subtitles,
  };
}
