import { describe, expect, it } from "vitest";
import { displayFilePath } from "./display-path";

describe("displayFilePath", () => {
  it("converts WSL mount paths to Windows drive paths", () => {
    expect(
      displayFilePath(
        "/mnt/d/Фильмы/Тренировочный.день.Training.Day.2001.BDRip-HEVC.1080p.mkv",
      ),
    ).toBe(
      "D:\\Фильмы\\Тренировочный.день.Training.Day.2001.BDRip-HEVC.1080p.mkv",
    );
  });

  it("handles lowercase drive letters", () => {
    expect(displayFilePath("/mnt/c/Users/test/file.mkv")).toBe(
      "C:\\Users\\test\\file.mkv",
    );
  });

  it("leaves non-WSL paths unchanged", () => {
    const path = "/home/user/Movies/film.mkv";
    expect(displayFilePath(path)).toBe(path);
  });

  it("leaves Windows-style paths unchanged", () => {
    const path = "D:\\Movies\\film.mkv";
    expect(displayFilePath(path)).toBe(path);
  });
});
