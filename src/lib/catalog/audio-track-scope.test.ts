import { describe, expect, it } from "vitest";
import { matchesAudioTrackScope } from "@/lib/catalog/audio-track-scope";

describe("matchesAudioTrackScope", () => {
  it("counts Russian tracks only by language", () => {
    expect(
      matchesAudioTrackScope(
        { language: "rus", translationType: "dub" },
        "rus",
      ),
    ).toBe(true);
    expect(
      matchesAudioTrackScope(
        { language: "eng", translationType: "author" },
        "rus",
      ),
    ).toBe(false);
  });

  it('counts original scope only for translationType "original"', () => {
    expect(
      matchesAudioTrackScope(
        { language: "eng", translationType: "original" },
        "original",
      ),
    ).toBe(true);
    expect(
      matchesAudioTrackScope(
        { language: "spa", translationType: "original" },
        "original",
      ),
    ).toBe(true);
    expect(
      matchesAudioTrackScope(
        { language: "eng", translationType: "author" },
        "original",
      ),
    ).toBe(false);
    expect(
      matchesAudioTrackScope(
        { language: "eng", translationType: null },
        "original",
      ),
    ).toBe(false);
  });
});
