import { describe, expect, it } from "vitest";
import { computeFranchiseSummary, computeFranchiseCollectionTier, isFutureFranchiseSlot, slotQualityLabel, slotTier, type FranchiseSlotSummary } from "@/lib/franchises/franchise-summary";
import type { FranchiseWithSlots } from "@/lib/franchises/franchise-include";
import type { MovieWithTracks } from "@/lib/movies/movie-include";
import type { ReleaseWithTracks } from "@/lib/movies/movie-include";

type AudioTrack = ReleaseWithTracks["audioTracks"][number];

type MovieOpts = {
  id?: number;
  title?: string;
  year?: number | null;
  durationSeconds?: number | null;
  rating?: number | null;
  resolutionLabel?: string | null;
  hdr?: string | null;
  atmos?: boolean;
  audioTracks?: ReleaseWithTracks["audioTracks"];
};

/** Рус. дубляж TrueHD Atmos 7.1.2 — квалифицирует релиз как ruby. */
function atmosDubTrack(releaseId = 1): AudioTrack {
  return {
    id: 1,
    releaseId,
    streamIndex: 0,
    codec: "truehd",
    profile: "Atmos",
    channels: 8,
    channelLayout: "7.1.2",
    bitrate: null,
    language: "rus",
    title: "TrueHD Atmos 7.1.2",
    translationType: "dub",
    isDefault: true,
  };
}

/** Рус. дубляж AC3 5.1 — surround на основной дорожке, квалифицирует как gold. */
function surroundDubTrack(releaseId = 1): AudioTrack {
  return {
    id: 1,
    releaseId,
    streamIndex: 0,
    codec: "ac3",
    profile: "None",
    channels: 6,
    channelLayout: "5.1",
    bitrate: null,
    language: "rus",
    title: "AC3 5.1",
    translationType: "dub",
    isDefault: true,
  };
}

/** Рус. дубляж AAC 2.0 — стерео, тира не даёт. */
function stereoDubTrack(releaseId = 1): AudioTrack {
  return {
    id: 1,
    releaseId,
    streamIndex: 0,
    codec: "aac",
    profile: "None",
    channels: 2,
    channelLayout: "2.0",
    bitrate: null,
    language: "rus",
    title: "AAC 2.0",
    translationType: "dub",
    isDefault: true,
  };
}

function makeRelease(opts: MovieOpts, releaseId = 1): ReleaseWithTracks {
  return {
    id: releaseId,
    movieId: opts.id ?? 1,
    externalStorageId: null,
    filePath: null,
    fileSize: null,
    fileMtime: null,
    fileHash: null,
    releaseType: null,
    version: "theatrical",
    durationSeconds: opts.durationSeconds ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
    externalStorage: null,
    videoTrack:
      opts.resolutionLabel || opts.hdr
        ? {
            id: 1,
            releaseId,
            streamIndex: 0,
            width: null,
            height: null,
            resolutionLabel: opts.resolutionLabel ?? null,
            codec: null,
            hdr: opts.hdr ?? null,
            fps: null,
            bitrate: null,
          }
        : null,
    audioTracks: opts.audioTracks ?? (opts.atmos ? [atmosDubTrack(releaseId)] : []),
    subtitleTracks: [],
  };
}

function makeMovie(opts: MovieOpts): MovieWithTracks {
  return {
    id: opts.id ?? 1,
    slug: `m-${opts.id ?? 1}`,
    title: opts.title ?? "Фильм",
    year: opts.year ?? null,
    description: null,
    matchKey: null,
    status: "CATALOG",
    coverPath: null,
    rating: opts.rating ?? null,
    watchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    releases: [makeRelease(opts)],
    movieGenres: [],
  } as MovieWithTracks;
}

type SlotOpts = {
  id?: number;
  storyOrder: number;
  movieId?: number | null;
  movie?: MovieWithTracks | null;
  titleHint?: string | null;
  yearHint?: number | null;
  isAnnounced?: boolean;
};

function makeSlot(opts: SlotOpts): FranchiseWithSlots["slots"][number] {
  return {
    id: opts.id ?? opts.storyOrder + 1,
    franchiseId: 1,
    movieId: opts.movieId ?? null,
    storyOrder: opts.storyOrder,
    titleHint: opts.titleHint ?? null,
    yearHint: opts.yearHint ?? null,
    isAnnounced: opts.isAnnounced ?? false,
    createdAt: new Date(),
    movie: opts.movie ?? null,
  } as unknown as FranchiseWithSlots["slots"][number];
}

function makeFranchise(
  slots: FranchiseWithSlots["slots"][number][],
): FranchiseWithSlots {
  return {
    id: 1,
    slug: "franchise",
    name: "Франшиза",
    description: null,
    coverPath: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    slots,
  } as unknown as FranchiseWithSlots;
}

describe("slotQualityLabel", () => {
  it("describes an empty slot", () => {
    expect(
      slotQualityLabel({ filled: false } as FranchiseSlotSummary),
    ).toBe("фильм не добавлен");
  });

  it("joins resolution, HDR and audio for a filled slot", () => {
    expect(
      slotQualityLabel({
        filled: true,
        resolution: "4K",
        dynamicRange: "HDR10",
        audioFull: "TrueHD Atmos",
      } as FranchiseSlotSummary),
    ).toBe("4K · HDR10 · TrueHD Atmos");
  });
});

describe("slotTier", () => {
  it("returns missing when no film is linked", () => {
    expect(slotTier(null)).toBe("missing");
  });

  it("returns standard for a non-4K film", () => {
    expect(
      slotTier(makeMovie({ resolutionLabel: "1080p", hdr: "SDR" })),
    ).toBe("standard");
  });

  it("returns standard for 4K + HDR without qualifying surround audio", () => {
    expect(
      slotTier(
        makeMovie({
          resolutionLabel: "4K",
          hdr: "HDR10",
          audioTracks: [stereoDubTrack()],
        }),
      ),
    ).toBe("standard");
  });

  it("returns gold for 4K + HDR + surround on the main track", () => {
    expect(
      slotTier(
        makeMovie({
          resolutionLabel: "4K",
          hdr: "HDR10",
          audioTracks: [surroundDubTrack()],
        }),
      ),
    ).toBe("gold");
  });

  it("returns ruby for 4K + HDR + рус. Atmos 7.1.2 dub", () => {
    expect(
      slotTier(makeMovie({ resolutionLabel: "4K", hdr: "HDR10", atmos: true })),
    ).toBe("ruby");
  });
});

describe("computeFranchiseSummary", () => {
  it("handles a franchise with no slots", () => {
    const s = computeFranchiseSummary(makeFranchise([]));
    expect(s.total).toBe(0);
    expect(s.filled).toBe(0);
    expect(s.missing).toBe(0);
    expect(s.yearStart).toBeNull();
    expect(s.yearEnd).toBeNull();
    expect(s.totalRuntimeSeconds).toBeNull();
    expect(s.averageRating).toBeNull();
    expect(s.tier).toBeNull();
  });

  it("marks every slot missing and uses yearHints for the era", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({ storyOrder: 0, yearHint: 2014, titleHint: "Часть 1" }),
        makeSlot({ storyOrder: 1, yearHint: 2023 }),
      ]),
    );
    expect(s.filled).toBe(0);
    expect(s.missing).toBe(2);
    expect(s.slots.every((slot) => slot.tier === "missing")).toBe(true);
    expect(s.yearStart).toBe(2014);
    expect(s.yearEnd).toBe(2023);
    expect(s.totalRuntimeSeconds).toBeNull();
    expect(s.tier).toBeNull();
  });

  it("aggregates era, runtime, rating and premium counts for a mix", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            title: "Часть 1",
            year: 2014,
            durationSeconds: 6000,
            rating: 8,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            title: "Часть 2",
            year: 2017,
            durationSeconds: 7000,
            rating: 7,
            resolutionLabel: "1080p",
            hdr: "SDR",
          }),
        }),
        makeSlot({ storyOrder: 2, yearHint: 2023 }),
      ]),
    );

    expect(s.total).toBe(3);
    expect(s.filled).toBe(2);
    expect(s.missing).toBe(1);
    expect(s.yearStart).toBe(2014);
    expect(s.yearEnd).toBe(2023);
    expect(s.totalRuntimeSeconds).toBe(13000);
    expect(s.averageRating).toBe(7.5);
    expect(s.premium).toEqual({ fourK: 1, hdr: 1, atmos: 1 });
    expect(s.tier).toBeNull();
    expect(s.slots.map((slot) => slot.tier)).toEqual([
      "ruby",
      "standard",
      "missing",
    ]);
  });

  it("flags tier ruby when every owned film is ruby", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            resolutionLabel: "4K",
            hdr: "DV:P7",
            atmos: true,
          }),
        }),
      ]),
    );
    expect(s.tier).toBe("ruby");
    expect(s.slots.every((slot) => slot.tier === "ruby")).toBe(true);
  });

  it("flags tier gold when every owned film is gold", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            resolutionLabel: "4K",
            hdr: "HDR10",
            audioTracks: [surroundDubTrack()],
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            resolutionLabel: "4K",
            hdr: "HDR10+",
            audioTracks: [surroundDubTrack()],
          }),
        }),
      ]),
    );
    expect(s.tier).toBe("gold");
    expect(s.slots.every((slot) => slot.tier === "gold")).toBe(true);
  });

  it("promotes tier to gold when owned films are a ruby + gold mix", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            resolutionLabel: "4K",
            hdr: "HDR10",
            audioTracks: [surroundDubTrack()],
          }),
        }),
      ]),
    );
    expect(s.tier).toBe("gold");
  });

  it("clears tier when collection is incomplete even if owned films are ruby", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({ storyOrder: 1, yearHint: 2024 }),
      ]),
    );
    expect(s.tier).toBeNull();
    expect(s.slots[0]?.tier).toBe("ruby");
  });

  it("ignores future slots when computing franchise tier", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            year: 2024,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            year: 2025,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({ storyOrder: 2, yearHint: 2028 }),
      ]),
    );

    expect(s.tier).toBe("ruby");
    expect(s.missing).toBe(1);
    expect(s.slots[2]?.isFuture).toBe(true);
    expect(s.slots[0]?.isFuture).toBe(false);
  });

  it("marks empty slots with future yearHint as isFuture", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({ storyOrder: 0, yearHint: 2029, titleHint: "Аватар 4" }),
      ]),
    );
    expect(s.slots[0]?.isFuture).toBe(true);
    expect(slotQualityLabel(s.slots[0]!)).toBe("ещё не вышел");
  });

  it("marks announced TBA slots without year as isFuture", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          titleHint: "Джон Уик 5",
          isAnnounced: true,
        }),
      ]),
    );
    expect(s.slots[0]?.isFuture).toBe(true);
    expect(s.slots[0]?.isAnnounced).toBe(true);
    expect(s.slots[0]?.year).toBeNull();
  });

  it("clears tier when every slot is filled but one film is standard", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({
            id: 1,
            resolutionLabel: "4K",
            hdr: "HDR10",
            atmos: true,
          }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({
            id: 2,
            resolutionLabel: "1080p",
            hdr: "SDR",
            audioTracks: [stereoDubTrack()],
          }),
        }),
      ]),
    );
    expect(s.tier).toBeNull();
  });
});

describe("computeFranchiseCollectionTier", () => {
  const CURRENT_YEAR = 2026;
  const rubySlot = { filled: true, tier: "ruby", year: 2024 } as FranchiseSlotSummary;
  const goldSlot = { filled: true, tier: "gold", year: 2024 } as FranchiseSlotSummary;
  const standardSlot = {
    filled: true,
    tier: "standard",
    year: 2024,
  } as FranchiseSlotSummary;
  const futureEmptySlot = {
    filled: false,
    tier: "missing",
    year: 2028,
  } as FranchiseSlotSummary;

  it("requires a full collection among non-future slots", () => {
    expect(
      computeFranchiseCollectionTier(
        [rubySlot, { filled: false, tier: "missing", year: 2024 } as FranchiseSlotSummary],
        CURRENT_YEAR,
      ),
    ).toBeNull();
  });

  it("returns ruby only when every relevant slot is ruby", () => {
    expect(
      computeFranchiseCollectionTier([rubySlot, rubySlot], CURRENT_YEAR),
    ).toBe("ruby");
  });

  it("returns gold for an all-gold or ruby+gold full collection", () => {
    expect(
      computeFranchiseCollectionTier([goldSlot, goldSlot], CURRENT_YEAR),
    ).toBe("gold");
    expect(
      computeFranchiseCollectionTier([rubySlot, goldSlot], CURRENT_YEAR),
    ).toBe("gold");
  });

  it("nulls tier when any owned film is standard", () => {
    expect(
      computeFranchiseCollectionTier([rubySlot, standardSlot], CURRENT_YEAR),
    ).toBeNull();
  });

  it("ignores future slots for completeness and quality", () => {
    expect(
      computeFranchiseCollectionTier(
        [rubySlot, rubySlot, futureEmptySlot],
        CURRENT_YEAR,
      ),
    ).toBe("ruby");

    expect(
      computeFranchiseCollectionTier(
        [
          rubySlot,
          {
            filled: true,
            tier: "standard",
            year: 2028,
          } as FranchiseSlotSummary,
          futureEmptySlot,
        ],
        CURRENT_YEAR,
      ),
    ).toBe("ruby");

    expect(
      computeFranchiseCollectionTier(
        [
          rubySlot,
          rubySlot,
          {
            filled: false,
            tier: "missing",
            year: null,
            isAnnounced: true,
          } as FranchiseSlotSummary,
        ],
        CURRENT_YEAR,
      ),
    ).toBe("ruby");
  });
});

describe("isFutureFranchiseSlot", () => {
  it("treats year greater than current as future", () => {
    expect(isFutureFranchiseSlot({ year: 2027 }, 2026)).toBe(true);
    expect(isFutureFranchiseSlot({ year: 2026 }, 2026)).toBe(false);
    expect(isFutureFranchiseSlot({ year: null }, 2026)).toBe(false);
  });

  it("treats empty announced slots without year as future", () => {
    expect(
      isFutureFranchiseSlot(
        { year: null, filled: false, isAnnounced: true },
        2026,
      ),
    ).toBe(true);
  });
});

describe("computeFranchiseSummary reel and ratings", () => {
  it("uses the default audio track for the reel, not a secondary DTS:X", () => {
    const movie = makeMovie({
      id: 1,
      resolutionLabel: "4K",
      hdr: "DV:P8",
      audioTracks: [
        {
          id: 1,
          releaseId: 1,
          streamIndex: 0,
          codec: "dts",
          profile: "None",
          channels: null,
          channelLayout: "5.1",
          bitrate: null,
          language: "rus",
          title: "DTS 5.1",
          translationType: "dub",
          isDefault: true,
        },
        {
          id: 2,
          releaseId: 1,
          streamIndex: 1,
          codec: "dts-hd",
          profile: "DTS:X MA",
          channels: null,
          channelLayout: "7.1",
          bitrate: null,
          language: "eng",
          title: "DTS:X MA",
          translationType: "original",
          isDefault: false,
        },
      ],
    });

    const s = computeFranchiseSummary(
      makeFranchise([makeSlot({ storyOrder: 0, movieId: 1, movie })]),
    );

    expect(s.slots[0].audio).toBe("DTS");
    expect(s.slots[0].audioFull).toBe("DTS");
    expect(s.slots[0].dynamicRange).toBe("DV");
  });

  it("rounds the average rating to one decimal", () => {
    const s = computeFranchiseSummary(
      makeFranchise([
        makeSlot({
          storyOrder: 0,
          movieId: 1,
          movie: makeMovie({ id: 1, rating: 8 }),
        }),
        makeSlot({
          storyOrder: 1,
          movieId: 2,
          movie: makeMovie({ id: 2, rating: 7 }),
        }),
        makeSlot({
          storyOrder: 2,
          movieId: 3,
          movie: makeMovie({ id: 3, rating: 7 }),
        }),
      ]),
    );
    // (8 + 7 + 7) / 3 = 7.333… → 7.3
    expect(s.averageRating).toBe(7.3);
    expect(s.ratedCount).toBe(3);
  });
});
