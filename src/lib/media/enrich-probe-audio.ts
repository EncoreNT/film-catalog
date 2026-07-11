import { detectTranslationType } from "@/lib/media/channels";
import type { ProbedAudioTrack } from "@/lib/media/ffprobe-parse";

function isOriginalEnglishTrack(track: ProbedAudioTrack): boolean {
  if (track.language !== "eng") return false;
  if (track.translationType === "original") return true;
  return /original/i.test(track.title ?? "");
}

/**
 * Fill gaps ffprobe often leaves in Russian remuxes: the default Russian dub
 * track frequently has no language/title tags while a sibling is tagged
 * eng + Original.
 */
export function enrichProbedAudioTracks(
  audio: ProbedAudioTrack[],
): ProbedAudioTrack[] {
  const hasOriginalEnglish = audio.some(isOriginalEnglishTrack);

  return audio.map((track) => {
    let language = track.language;
    let translationType =
      track.translationType ?? detectTranslationType(track.title);

    if (!language && hasOriginalEnglish && track.isDefault) {
      language = "rus";
      if (!translationType) {
        translationType = "dub";
      }
    }

    return { ...track, language, translationType };
  });
}
