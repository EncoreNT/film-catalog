import type {
  AudioFormRow,
  VideoFieldState,
} from "@/lib/movies/movie-form-types";
import {
  buildAudioTracksPayload,
  buildVideoTrackPayload,
} from "@/lib/movies/build-movie-payload-tracks";
import { releaseTier } from "@/lib/media/release-tags";

/** Preview the same normalized values that will be saved, without database identities. */
export function releaseFormTier(video: VideoFieldState, audio: AudioFormRow[]) {
  return releaseTier({
    videoTrack: buildVideoTrackPayload(video),
    audioTracks: buildAudioTracksPayload(audio).map((track) => ({
      ...track,
      channels: null,
    })),
  });
}
