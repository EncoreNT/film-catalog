import { describe, expect, it } from "vitest";
import {
  audioTrackChannelCount,
  bestRussianDubTrack,
  catalogCardTech,
  catalogTierRibbon,
  premiumHdrView,
  releaseTier,
  releaseQuickSpecHints,
  secondaryTags,
} from "@/lib/media/spec-tags";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

function release(
  partial: Partial<ReleaseWithTracks> & { id: number },
): ReleaseWithTracks {
  return {
    id: partial.id,
    movieId: 1,
    externalStorageId: null,
    filePath: null,
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: partial.releaseType ?? null,
    version: "theatrical",
    durationSeconds: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack: partial.videoTrack ?? null,
    audioTracks: partial.audioTracks ?? [],
    subtitleTracks: partial.subtitleTracks ?? [],
  };
}

function video(hdr: string | null) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    width: 3840,
    height: 2160,
    resolutionLabel: "4K",
    codec: "hevc",
    hdr,
    fps: "24",
    bitrate: 50000000,
  };
}

function audio(
  overrides: Partial<{
    language: string | null;
    isDefault: boolean;
    codec: string | null;
    profile: string | null;
    channels: number | null;
    channelLayout: string | null;
    translationType: string | null;
  }> = {},
) {
  return {
    id: 1,
    releaseId: 1,
    streamIndex: 0,
    language: "rus",
    isDefault: true,
    codec: "truehd",
    profile: "Atmos",
    channels: 8,
    channelLayout: "7.1",
    translationType: "dub",
    title: null,
    bitrate: 4000,
    ...overrides,
  };
}

describe("premiumHdrView", () => {
  it("возвращает null, если видеотрека нет", () => {
    expect(premiumHdrView(release({ id: 1 }))).toBeNull();
  });

  it("возвращает null для SDR", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("SDR") })),
    ).toBeNull();
  });

  it("сводит HDR10 к плоскому лейблу", () => {
    expect(premiumHdrView(release({ id: 1, videoTrack: video("HDR10") }))).toEqual(
      { label: "HDR10", isDolbyVision: false },
    );
  });

  it("сводит HDR10+ к плоскому лейблу", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("HDR10+") })),
    ).toEqual({ label: "HDR10+", isDolbyVision: false });
  });

  it("форматирует Dolby Vision с профилем", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("DV:P8.1") })),
    ).toEqual({
      label: "Dolby Vision · Profile 8.1",
      isDolbyVision: true,
    });
  });

  it("форматирует Dolby Vision без профиля", () => {
    expect(
      premiumHdrView(release({ id: 1, videoTrack: video("DV:") })),
    ).toEqual({ label: "Dolby Vision", isDolbyVision: true });
  });
});

describe("secondaryTags", () => {
  it("не дублирует разрешение, HDR и объектный звук — они в spec-ribbon", () => {
    const tags = secondaryTags(
      release({
        id: 1,
        releaseType: "bdremux",
        videoTrack: video("DV:P8.1"),
        audioTracks: [
          {
            id: 1,
            releaseId: 1,
            streamIndex: 0,
            language: "rus",
            isDefault: true,
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            translationType: "dub",
            title: null,
            bitrate: 4000,
          },
        ],
      }),
    );

    const kinds = tags.map((t) => t.kind);
    expect(kinds).not.toContain("resolution");
    expect(kinds).not.toContain("hdr");
    expect(kinds).not.toContain("audio-3d");
    // source и каналы остаются вторичными бейджами
    expect(kinds).toContain("release");
    expect(kinds).toContain("channel");
  });
});

describe("catalogCardTech", () => {
  it("собирает полные tech-данные премиум-релиза (4K + HDR + Atmos)", () => {
    const tech = catalogCardTech(
      release({
        id: 1,
        releaseType: "bdremux",
        videoTrack: video("HDR10"),
        audioTracks: [audio()],
      }),
    );

    expect(tech.releaseType).toBe("BDRemux");
    expect(tech.is4K).toBe(true);
    expect(tech.resolution).toBe("4K");
    expect(tech.resolutionPixels).toBe("3840×2160");
    expect(tech.videoCodec).toBe("HEVC");
    expect(tech.hdr).toBe("HDR10");
    expect(tech.audioLabel).toBe("TrueHD Atmos");
    expect(tech.audioCodecShort).toBe("TrueHD");
    expect(tech.channels).toBe("7.1");
    expect(tech.translation).toBe("дубляж");
  });

  it("помечает 1080p SDR и опускает hdr/аудио при их отсутствии", () => {
    const tech = catalogCardTech(
      release({
        id: 2,
        releaseType: "web-dl",
        videoTrack: {
          ...video("SDR"),
          width: 1920,
          height: 1080,
          resolutionLabel: "1080p",
          codec: "h264",
        },
        audioTracks: [],
      }),
    );

    expect(tech.is4K).toBe(false);
    expect(tech.resolution).toBe("1080p");
    expect(tech.resolutionPixels).toBe("1920×1080");
    expect(tech.videoCodec).toBe("H.264");
    expect(tech.hdr).toBeNull();
    expect(tech.audioLabel).toBeNull();
    expect(tech.audioCodecShort).toBeNull();
    expect(tech.channels).toBeNull();
    expect(tech.translation).toBeNull();
    expect(tech.releaseType).toBe("WEB-DL");
  });

  it("возвращает null-данные для пустого релиза", () => {
    const tech = catalogCardTech(release({ id: 3 }));

    expect(tech.releaseType).toBeNull();
    expect(tech.resolution).toBeNull();
    expect(tech.is4K).toBe(false);
    expect(tech.videoCodec).toBeNull();
    expect(tech.hdr).toBeNull();
    expect(tech.audioLabel).toBeNull();
    expect(tech.audioCodecShort).toBeNull();
    expect(tech.channels).toBeNull();
    expect(tech.translation).toBeNull();
  });

  it("помечает channels как null для layout 'other'", () => {
    const tech = catalogCardTech(
      release({
        id: 4,
        videoTrack: video("HDR10"),
        audioTracks: [
          audio({
            codec: "ac3",
            profile: null,
            channels: 2,
            channelLayout: "other",
          }),
        ],
      }),
    );

    expect(tech.audioLabel).toBe("AC3");
    expect(tech.audioCodecShort).toBe("AC3");
    expect(tech.channels).toBeNull();
  });
});

describe("releaseTier", () => {
  it("ruby: 4K + HDR + Atmos 7.1", () => {
    expect(
      releaseTier(
        release({
          id: 1,
          videoTrack: video("HDR10"),
          audioTracks: [audio()],
        }),
      ),
    ).toBe("ruby");
  });

  it("gold: 4K + HDR + DTS 5.1 (без Atmos)", () => {
    expect(
      releaseTier(
        release({
          id: 16,
          videoTrack: video("DV:P8.1"),
          audioTracks: [
            audio({
              codec: "dts",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
            }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("gold: 4K + HDR + AC3 5.1 (без Atmos)", () => {
    expect(
      releaseTier(
        release({
          id: 2,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
            }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("ruby, если основной трек — Atmos (вторичный AC3 не понижает тиер)", () => {
    expect(
      releaseTier(
        release({
          id: 3,
          videoTrack: video("DV:P8.1"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
              isDefault: false,
            }),
            audio(), // Atmos 7.1, isDefault=true → основной
          ],
        }),
      ),
    ).toBe("ruby");
  });

  it("gold, если основной трек AC3 5.1, а Atmos — вторичный (Aladdin case)", () => {
    expect(
      releaseTier(
        release({
          id: 12,
          videoTrack: video("DV:P8"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: null,
              channelLayout: "5.1",
              isDefault: true,
              translationType: "dub",
            }),
            audio({
              codec: "truehd",
              profile: "Atmos",
              channels: null,
              channelLayout: "7.1",
              isDefault: false,
              translationType: "original",
            }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("ruby, если лучший русский дубляж — Atmos 7.1 (даже при основном AC3)", () => {
    expect(
      releaseTier(
        release({
          id: 14,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
              isDefault: true,
              translationType: "dub",
            }),
            audio({
              codec: "truehd",
              profile: "Atmos",
              channels: 8,
              channelLayout: "7.1",
              isDefault: false,
              translationType: "dub",
            }),
          ],
        }),
      ),
    ).toBe("ruby");
  });

  it("не ruby, если Atmos только на оригинале, а дубляж — AC3", () => {
    expect(
      releaseTier(
        release({
          id: 15,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
              isDefault: true,
              translationType: "dub",
            }),
            audio({
              codec: "truehd",
              profile: "Atmos",
              channels: 8,
              channelLayout: "7.1",
              isDefault: false,
              translationType: "original",
              language: "eng",
            }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("null, если нет 4K", () => {
    expect(
      releaseTier(
        release({
          id: 4,
          videoTrack: { ...video("HDR10"), resolutionLabel: "1080p", width: 1920, height: 1080 },
          audioTracks: [audio()],
        }),
      ),
    ).toBeNull();
  });

  it("null, если 4K + HDR, но AC3 стерео (нужно ≥ 5.1)", () => {
    expect(
      releaseTier(
        release({
          id: 5,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({ codec: "ac3", profile: null, channels: 2, channelLayout: "2.0" }),
          ],
        }),
      ),
    ).toBeNull();
  });

  it("gold, если 4K + HDR + Atmos 5.1 (ruby нужно ≥ 7.1)", () => {
    expect(
      releaseTier(
        release({
          id: 6,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({ channels: 6, channelLayout: "5.1" }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("null, если 4K + SDR (нет HDR)", () => {
    expect(
      releaseTier(
        release({
          id: 7,
          videoTrack: video("SDR"),
          audioTracks: [audio()],
        }),
      ),
    ).toBeNull();
  });

  it("null, если нет аудиотреков", () => {
    expect(
      releaseTier(
        release({ id: 8, videoTrack: video("HDR10"), audioTracks: [] }),
      ),
    ).toBeNull();
  });

  it("DTS:X не считается Atmos для ruby, но даёт gold при 7.1", () => {
    expect(
      releaseTier(
        release({
          id: 9,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({ codec: "dts-hd", profile: "DTS:X MA", channels: 8, channelLayout: "7.1" }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("fallback каналов из channelLayout при channels=null: AC3 5.1 → gold", () => {
    expect(
      releaseTier(
        release({
          id: 10,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: null,
              channelLayout: "5.1",
            }),
          ],
        }),
      ),
    ).toBe("gold");
  });

  it("fallback каналов из channelLayout: Atmos 7.1 → ruby", () => {
    expect(
      releaseTier(
        release({
          id: 11,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({ channels: null, channelLayout: "7.1" }),
          ],
        }),
      ),
    ).toBe("ruby");
  });
});

describe("bestRussianDubTrack", () => {
  it("выбирает Atmos-дубляж над default AC3", () => {
    const track = bestRussianDubTrack(
      release({
        id: 1,
        audioTracks: [
          audio({
            codec: "ac3",
            profile: null,
            channels: 6,
            channelLayout: "5.1",
            isDefault: true,
            translationType: "dub",
          }),
          audio({
            codec: "truehd",
            profile: "Atmos",
            channels: 8,
            channelLayout: "7.1",
            isDefault: false,
            translationType: "dub",
          }),
        ],
      }),
    );
    expect(track?.profile).toBe("Atmos");
    expect(track?.translationType).toBe("dub");
  });

  it("игнорирует оригинал и не-русские дорожки", () => {
    const track = bestRussianDubTrack(
      release({
        id: 2,
        audioTracks: [
          audio({
            codec: "truehd",
            profile: "Atmos",
            translationType: "original",
            language: "eng",
          }),
        ],
      }),
    );
    expect(track).toBeNull();
  });
});

describe("catalogTierRibbon", () => {
  it("gold → 4K | HDR", () => {
    expect(catalogTierRibbon("gold")).toBe("4K | HDR");
  });

  it("ruby → 4K | HDR | РУС. ATMOS", () => {
    expect(catalogTierRibbon("ruby")).toBe("4K | HDR | РУС. ATMOS");
  });

  it("null tier → null ribbon", () => {
    expect(catalogTierRibbon(null)).toBeNull();
  });
});

describe("releaseQuickSpecHints", () => {
  it("returns 4K, HDR and Atmos for a premium release", () => {
    expect(
      releaseQuickSpecHints(
        release({
          id: 1,
          videoTrack: video("HDR10"),
          audioTracks: [audio()],
        }),
      ),
    ).toEqual(["4K", "HDR", "Atmos"]);
  });

  it("omits Atmos when the main track is not Atmos", () => {
    expect(
      releaseQuickSpecHints(
        release({
          id: 2,
          videoTrack: video("HDR10"),
          audioTracks: [
            audio({
              codec: "ac3",
              profile: null,
              channels: 6,
              channelLayout: "5.1",
            }),
          ],
        }),
      ),
    ).toEqual(["4K", "HDR"]);
  });

  it("returns empty hints for SDR 1080p stereo", () => {
    expect(
      releaseQuickSpecHints(
        release({
          id: 3,
          videoTrack: {
            ...video("SDR"),
            resolutionLabel: "1080p",
            width: 1920,
            height: 1080,
          },
          audioTracks: [
            audio({ codec: "aac", profile: null, channels: 2, channelLayout: "2.0" }),
          ],
        }),
      ),
    ).toEqual([]);
  });
});

describe("audioTrackChannelCount", () => {
  it("возвращает channels, если задано", () => {
    expect(audioTrackChannelCount(audio({ channels: 8 }))).toBe(8);
  });

  it("парсит bed-ранг из channelLayout при channels=null", () => {
    expect(
      audioTrackChannelCount(audio({ channels: null, channelLayout: "5.1" })),
    ).toBe(6);
  });

  it("0 для layout 'other' и null channels", () => {
    expect(
      audioTrackChannelCount(audio({ channels: null, channelLayout: "other" })),
    ).toBe(0);
  });

  it("0 для невалидного layout", () => {
    expect(
      audioTrackChannelCount(audio({ channels: null, channelLayout: "quad" })),
    ).toBe(0);
  });
});
