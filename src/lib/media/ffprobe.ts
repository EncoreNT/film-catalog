import { execa } from "execa";
import { getResolutionLabel } from "@/lib/shared/resolution";
import { enrichProbedAudioTracks } from "@/lib/media/enrich-probe-audio";
import {
  dedupeDefaultAudioTracks,
  detectVideoHdr,
  parseAudioStream,
  parseDurationSeconds,
  parseFps,
  parseSubtitleStream,
  streamBitrateKbps,
  type FfprobeOutput,
  type FfprobeStream,
  type ProbeResult,
  type ProbedAudioTrack,
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

export { detectVideoHdr } from "@/lib/media/ffprobe-parse";

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
    video = {
      streamIndex: videoStream.index,
      width,
      height,
      resolutionLabel: getResolutionLabel(width, height),
      codec: videoStream.codec_name ?? null,
      hdr: detectVideoHdr(videoStream),
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
