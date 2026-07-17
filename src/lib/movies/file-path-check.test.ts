import { describe, expect, it } from "vitest";
import {
  buildFilePathHeadUrl,
  filePathExistsFromHead,
  shouldCheckFilePath,
} from "@/lib/movies/file-path-check";

describe("file-path-check", () => {
  describe("shouldCheckFilePath", () => {
    it("skips empty and whitespace-only paths", () => {
      expect(shouldCheckFilePath("")).toBe(false);
      expect(shouldCheckFilePath("   ")).toBe(false);
    });

    it("checks non-empty paths", () => {
      expect(shouldCheckFilePath("/Movies/Dune.mkv")).toBe(true);
    });
  });

  describe("buildFilePathHeadUrl", () => {
    it("encodes the path query param", () => {
      expect(buildFilePathHeadUrl("/a b.mkv")).toBe(
        "/api/movies?path=%2Fa%20b.mkv",
      );
    });

    it("converts Windows paths to WSL before encoding", () => {
      expect(buildFilePathHeadUrl("D:\\Movies\\film.mkv")).toBe(
        "/api/movies?path=%2Fmnt%2Fd%2FMovies%2Ffilm.mkv",
      );
    });

    it("converts WSL paths before encoding", () => {
      expect(buildFilePathHeadUrl("/mnt/d/Movies/film.mkv")).toBe(
        "/api/movies?path=%2Fmnt%2Fd%2FMovies%2Ffilm.mkv",
      );
    });
  });

  describe("filePathExistsFromHead", () => {
    it("mirrors fetch HEAD ok flag", () => {
      expect(filePathExistsFromHead(true)).toBe(true);
      expect(filePathExistsFromHead(false)).toBe(false);
    });
  });
});
