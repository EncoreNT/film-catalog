import { describe, expect, it } from "vitest";
import {
  franchiseListQuerySchema,
  mergeSchema,
  movieCreateSchema,
  movieFranchiseAttachSchema,
  movieListQuerySchema,
  movieUpdateSchema,
  releaseCreateSchema,
} from "@/lib/api/validators";

describe("movieListQuerySchema", () => {
  it("coerces page and limit with defaults from parseListQuery callers", () => {
    const parsed = movieListQuerySchema.parse({ page: "2", limit: "24" });
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(24);
  });

  it("accepts fileSize sort", () => {
    expect(movieListQuerySchema.parse({ sort: "fileSize" }).sort).toBe(
      "fileSize",
    );
  });

  it("rejects invalid sort field", () => {
    expect(() =>
      movieListQuerySchema.parse({ sort: "unknown" }),
    ).toThrow();
  });

  it("accepts watched enum only", () => {
    expect(movieListQuerySchema.parse({ watched: "unwatched" }).watched).toBe(
      "unwatched",
    );
    expect(() => movieListQuerySchema.parse({ watched: "maybe" })).toThrow();
  });

  it("coerces minRating within 1..10", () => {
    expect(movieListQuerySchema.parse({ minRating: "8" }).minRating).toBe(8);
    expect(() => movieListQuerySchema.parse({ minRating: "11" })).toThrow();
  });
});

describe("movieUpdateSchema", () => {
  it("rejects empty title when provided", () => {
    expect(() => movieUpdateSchema.parse({ title: "" })).toThrow();
  });

  it("accepts null rating and ISO watchedAt", () => {
    const parsed = movieUpdateSchema.parse({
      rating: null,
      watchedAt: "2024-06-01T12:00:00.000Z",
    });
    expect(parsed.rating).toBeNull();
    expect(parsed.watchedAt).toBe("2024-06-01T12:00:00.000Z");
  });
});

describe("movieCreateSchema", () => {
  it("requires non-empty title", () => {
    expect(() => movieCreateSchema.parse({ title: "" })).toThrow();
  });

  it("accepts nested release with optional probe flags", () => {
    const parsed = movieCreateSchema.parse({
      title: "Matrix",
      release: { skipProbe: true, probeOnly: false },
    });
    expect(parsed.release?.skipProbe).toBe(true);
  });
});

describe("releaseCreateSchema", () => {
  it("allows audio tracks without streamIndex on create", () => {
    const parsed = releaseCreateSchema.parse({
      audioTracks: [{ codec: "aac", streamIndex: undefined }],
    });
    expect(parsed.audioTracks?.[0].codec).toBe("aac");
  });
});

describe("mergeSchema", () => {
  it("requires otherId and optional choices", () => {
    const parsed = mergeSchema.parse({
      otherId: 5,
      choices: { rating: "other" },
    });
    expect(parsed.otherId).toBe(5);
    expect(parsed.choices?.rating).toBe("other");
  });
});

describe("movieFranchiseAttachSchema", () => {
  it("requires franchiseId or name", () => {
    expect(() => movieFranchiseAttachSchema.parse({})).toThrow(/franchiseId/);
    expect(
      movieFranchiseAttachSchema.parse({ franchiseId: 1 }).franchiseId,
    ).toBe(1);
    expect(movieFranchiseAttachSchema.parse({ name: "MCU" }).name).toBe("MCU");
  });
});

describe("franchiseListQuerySchema", () => {
  it("accepts slotCount sort", () => {
    expect(
      franchiseListQuerySchema.parse({ sort: "slotCount", order: "desc" }).sort,
    ).toBe("slotCount");
  });
});
