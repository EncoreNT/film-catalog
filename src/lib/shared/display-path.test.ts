import { describe, expect, it } from "vitest";
import {
  commitFilePathInput,
  displayFileDir,
  displayFilePath,
  formatFilePathInput,
  joinRuntimePath,
  normalizeFilePathInput,
  resolveRuntimePath,
  sanitizeFilename,
} from "@/lib/shared/display-path";

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
    expect(displayFilePath(path)).toBe("D:\\Movies\\film.mkv");
  });

  it("collapses duplicate separators in WSL paths", () => {
    expect(displayFilePath("/mnt/d//TV//Movies/custom.mkv")).toBe(
      "D:\\TV\\Movies\\custom.mkv",
    );
  });

  it("normalizes Windows paths with duplicate backslashes", () => {
    expect(displayFilePath("D:\\\\TV\\\\Movies\\\\custom.mkv")).toBe(
      "D:\\TV\\Movies\\custom.mkv",
    );
  });
});

describe("displayFileDir", () => {
  it("returns parent directory in display format", () => {
    expect(
      displayFileDir(
        "/mnt/d/Фильмы/4K/Harry.Potter.HDR/2001.Harry.Potter.and.the.Sorcerers.Stone.4K.HEVC.HDR.mkv",
      ),
    ).toBe("D:\\Фильмы\\4K\\Harry.Potter.HDR");
    expect(displayFileDir("D:\\Movies\\film.mkv")).toBe("D:\\Movies");
  });
});

describe("resolveRuntimePath", () => {
  it("converts Windows drive paths to WSL mount paths", () => {
    expect(resolveRuntimePath("D:\\TV\\Movies")).toBe("/mnt/d/TV/Movies");
    expect(resolveRuntimePath("d:/TV/Movies/film.mkv")).toBe(
      "/mnt/d/TV/Movies/film.mkv",
    );
  });

  it("normalizes existing WSL paths", () => {
    expect(resolveRuntimePath("/mnt/D/Movies")).toBe("/mnt/d/Movies");
  });

  it("leaves POSIX paths unchanged", () => {
    expect(resolveRuntimePath("/home/user/Movies")).toBe("/home/user/Movies");
  });

  it("collapses duplicate separators in Windows paths", () => {
    expect(resolveRuntimePath("D:\\\\TV\\\\Movies\\\\custom.mkv")).toBe(
      "/mnt/d/TV/Movies/custom.mkv",
    );
  });
});

describe("joinRuntimePath", () => {
  it("joins directory and filename", () => {
    expect(joinRuntimePath("D:\\TV", "film.mkv")).toBe("/mnt/d/TV/film.mkv");
  });
});

describe("normalizeFilePathInput", () => {
  it("converts Windows paths to WSL runtime paths", () => {
    expect(normalizeFilePathInput("D:\\Movies\\film.mkv")).toBe(
      "/mnt/d/Movies/film.mkv",
    );
  });

  it("normalizes WSL mount paths to runtime form", () => {
    expect(normalizeFilePathInput("/mnt/D/Movies/film.mkv")).toBe(
      "/mnt/d/Movies/film.mkv",
    );
  });

  it("maps Win and WSL inputs to the same runtime path", () => {
    const win = normalizeFilePathInput("D:\\TV\\Movies\\custom.mkv");
    const wsl = normalizeFilePathInput("/mnt/d/TV/Movies/custom.mkv");
    expect(win).toBe(wsl);
  });

  it("returns null for empty input", () => {
    expect(normalizeFilePathInput("")).toBeNull();
    expect(normalizeFilePathInput("   ")).toBeNull();
    expect(normalizeFilePathInput(null)).toBeNull();
  });
});

describe("formatFilePathInput", () => {
  it("formats runtime paths for display", () => {
    expect(formatFilePathInput("/mnt/d/Movies/film.mkv")).toBe(
      "D:\\Movies\\film.mkv",
    );
  });
});

describe("commitFilePathInput", () => {
  it("returns runtime and Windows display for Win input", () => {
    expect(commitFilePathInput("D:\\TV\\Movies\\custom.mkv")).toEqual({
      runtime: "/mnt/d/TV/Movies/custom.mkv",
      display: "D:\\TV\\Movies\\custom.mkv",
    });
  });

  it("preserves WSL display for WSL input", () => {
    expect(commitFilePathInput("/mnt/D/TV/Movies/custom.mkv")).toEqual({
      runtime: "/mnt/d/TV/Movies/custom.mkv",
      display: "/mnt/d/TV/Movies/custom.mkv",
    });
  });
});

describe("sanitizeFilename", () => {
  it("removes unsafe characters", () => {
    expect(sanitizeFilename('Inception: test?.mkv')).toBe("Inception test.mkv");
  });

  it("falls back when empty", () => {
    expect(sanitizeFilename("???")).toBe("release.mkv");
  });
});
