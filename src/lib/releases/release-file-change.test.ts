import { describe, expect, it } from "vitest";
import { hasReleaseFilenameChanged } from "./release-file-change";

describe("hasReleaseFilenameChanged", () => {
  it.each([
    ["F:\\Фильмы\\Семь.mkv", "D:\\Архив\\Семь.mkv"],
    ["F:\\Фильмы\\Семь.mkv", "/mnt/f/Фильмы/Семь.mkv"],
    ["/mnt/f/Фильмы/Семь.mkv", " /home/user/Семь.mkv "],
    ["/mnt/f/Семь.mkv", "/mnt/f/СЕМЬ.MKV"],
    ["/mnt/f/Amélie.mkv", "/mnt/d/Ame\u0301lie.mkv"],
  ])(
    "ignores location, path format and cosmetic case changes: %s → %s",
    (before, after) => {
      expect(hasReleaseFilenameChanged(before, after)).toBe(false);
    },
  );

  it.each([
    ["/mnt/f/Семь.mkv", "/mnt/f/Другой фильм.mkv"],
    ["/mnt/f/Семь.BDRip.mkv", "/mnt/f/Семь.BDRemux.mkv"],
    ["/mnt/f/Семь.mkv", "/mnt/f/Семь.mp4"],
  ])(
    "detects a different film, release or extension: %s → %s",
    (before, after) => {
      expect(hasReleaseFilenameChanged(before, after)).toBe(true);
    },
  );

  it("does not warn for an initial selection, cleared input or unfinished folder path", () => {
    expect(hasReleaseFilenameChanged(null, "/mnt/f/Семь.mkv")).toBe(false);
    expect(hasReleaseFilenameChanged("/mnt/f/Семь.mkv", "")).toBe(false);
    expect(hasReleaseFilenameChanged("/mnt/f/Семь.mkv", "/mnt/d/")).toBe(false);
    expect(hasReleaseFilenameChanged(undefined, undefined)).toBe(false);
  });
});
