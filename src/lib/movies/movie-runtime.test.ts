import { describe, expect, it } from "vitest";
import {
  movieCanonicalDurationSeconds,
  movieTheatricalDurationSeconds,
  resolveDetailRuntimeDisplay,
} from "@/lib/movies/movie-runtime";

describe("movieCanonicalDurationSeconds", () => {
  it("prefers theatrical duration over a longer alternate cut", () => {
    expect(
      movieCanonicalDurationSeconds([
        { version: "theatrical", durationSeconds: 5808 },
        { version: "kid-mode", durationSeconds: 6431 },
      ]),
    ).toBe(5808);
  });

  it("treats missing version as theatrical", () => {
    expect(
      movieCanonicalDurationSeconds([
        { version: null, durationSeconds: 3600 },
        { version: "extended", durationSeconds: 7200 },
      ]),
    ).toBe(3600);
  });

  it("falls back to the longest release when no theatrical duration exists", () => {
    expect(
      movieCanonicalDurationSeconds([
        { version: "kid-mode", durationSeconds: 6431 },
        { version: "extended", durationSeconds: 7200 },
      ]),
    ).toBe(7200);
  });

  it("returns null when no release has duration", () => {
    expect(
      movieCanonicalDurationSeconds([
        { version: "theatrical", durationSeconds: null },
        { version: "kid-mode", durationSeconds: 0 },
      ]),
    ).toBeNull();
  });
});

describe("movieTheatricalDurationSeconds", () => {
  it("ignores alternate cuts even when they are the only timed files", () => {
    expect(
      movieTheatricalDurationSeconds([
        { version: "kid-mode", durationSeconds: 6431 },
      ]),
    ).toBeNull();
  });
});

describe("resolveDetailRuntimeDisplay", () => {
  it("keeps theatrical runtime on the base cut", () => {
    expect(
      resolveDetailRuntimeDisplay({
        movieSeconds: 5808,
        activeRelease: { version: "theatrical", durationSeconds: 5810 },
      }),
    ).toEqual({
      seconds: 5808,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    });
  });

  it("switches to the alternate cut when duration differs", () => {
    expect(
      resolveDetailRuntimeDisplay({
        movieSeconds: 5808,
        activeRelease: { version: "kid-mode", durationSeconds: 6431 },
      }),
    ).toEqual({
      seconds: 6431,
      source: "cut",
      cutLabel: "Детская версия",
      deltaSeconds: 623,
    });
  });

  it("does not highlight an alternate cut with the same runtime", () => {
    expect(
      resolveDetailRuntimeDisplay({
        movieSeconds: 5808,
        activeRelease: { version: "extended", durationSeconds: 5820 },
      }).source,
    ).toBe("movie");
  });

  it("locks to movie runtime for multipart totals", () => {
    expect(
      resolveDetailRuntimeDisplay({
        movieSeconds: 9000,
        activeRelease: { version: "kid-mode", durationSeconds: 6431 },
        lockToMovieRuntime: true,
      }),
    ).toEqual({
      seconds: 9000,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    });
  });

  it("does not highlight an alternate cut without a theatrical baseline", () => {
    expect(
      resolveDetailRuntimeDisplay({
        movieSeconds: null,
        activeRelease: { version: "kid-mode", durationSeconds: 6431 },
      }),
    ).toEqual({
      seconds: 6431,
      source: "movie",
      cutLabel: null,
      deltaSeconds: null,
    });
  });
});
