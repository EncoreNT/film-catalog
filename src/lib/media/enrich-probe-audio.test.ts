import { describe, expect, it } from "vitest";
import { enrichProbedAudioTracks } from "@/lib/media/enrich-probe-audio";
import type { ProbedAudioTrack } from "@/lib/media/ffprobe-parse";

function audio(
  partial: Partial<ProbedAudioTrack> & Pick<ProbedAudioTrack, "streamIndex">,
): ProbedAudioTrack {
  return {
    codec: "truehd",
    profile: "Atmos",
    channels: 8,
    channelLayout: "7.1",
    bitrate: 4000,
    language: null,
    translationType: null,
    title: null,
    isDefault: false,
    ...partial,
  };
}

describe("enrichProbedAudioTracks", () => {
  it("infers rus dub on default untagged track when Original eng exists", () => {
    const enriched = enrichProbedAudioTracks([
      audio({ streamIndex: 1, isDefault: true }),
      audio({
        streamIndex: 2,
        language: "eng",
        title: "Original",
        translationType: "original",
      }),
    ]);

    expect(enriched[0]).toMatchObject({
      language: "rus",
      translationType: "dub",
    });
    expect(enriched[1]).toMatchObject({
      language: "eng",
      translationType: "original",
    });
  });

  it("keeps tagged tracks unchanged", () => {
    const enriched = enrichProbedAudioTracks([
      audio({
        streamIndex: 1,
        language: "rus",
        translationType: "pro_multi",
        title: "MVO, HDRezka Studio",
      }),
    ]);

    expect(enriched[0]).toMatchObject({
      language: "rus",
      translationType: "pro_multi",
    });
  });

  it("does not infer rus when there is no Original english sibling", () => {
    const enriched = enrichProbedAudioTracks([
      audio({ streamIndex: 1, isDefault: true }),
    ]);

    expect(enriched[0]).toMatchObject({
      language: null,
      translationType: null,
    });
  });
});
