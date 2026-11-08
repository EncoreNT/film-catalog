import { describe, expect, it } from "vitest";
import { releaseFormTier } from "./release-form-tier";
import {
  emptyAudioFormRow,
  emptyVideoFieldState,
} from "@/lib/movies/movie-form-types";

const video = {
  ...emptyVideoFieldState(),
  resolutionLabel: "4K",
  hdr: "HDR10",
};
const audio = {
  ...emptyAudioFormRow({ rowKey: "test", isDefault: true }),
  codec: "truehd",
  language: "rus",
  translationType: "dub",
  channelLayout: "7.1",
  profile: "Atmos",
};

describe("releaseFormTier", () => {
  it("keeps incomplete or SDR forms neutral", () => {
    expect(releaseFormTier(emptyVideoFieldState(), [])).toBeNull();
    expect(releaseFormTier(video, [])).toBeNull();
    expect(releaseFormTier({ ...video, hdr: "SDR" }, [audio])).toBeNull();
    expect(
      releaseFormTier({ ...video, resolutionLabel: "1080p" }, [audio]),
    ).toBeNull();
  });
  it("updates ruby to gold and neutral as audio fields change", () => {
    expect(releaseFormTier(video, [audio])).toBe("ruby");
    expect(
      releaseFormTier(video, [
        { ...audio, profile: "None", channelLayout: "5.1" },
      ]),
    ).toBe("gold");
    expect(
      releaseFormTier(video, [
        { ...audio, profile: "None", channelLayout: "2.0" },
      ]),
    ).toBeNull();
  });
  it("uses the canonical main-track and Russian spatial rules", () => {
    expect(releaseFormTier(video, [{ ...audio, language: "eng" }])).toBe(
      "gold",
    );
    expect(
      releaseFormTier(video, [
        { ...audio, isDefault: false },
        { ...audio, language: "eng", channelLayout: "2.0", profile: "None" },
      ]),
    ).toBe("ruby");
    expect(
      releaseFormTier(video, [
        { ...audio, profile: "None", isDefault: false },
        { ...audio, language: "eng", channelLayout: "2.0", profile: "None" },
      ]),
    ).toBeNull();
  });
});
