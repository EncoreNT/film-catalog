import { describe, expect, it, vi } from "vitest";
import { applyParsedFilePathFields } from "@/hooks/useProbeFile";

describe("applyParsedFilePathFields", () => {
  it("fills only empty fields from the file path", () => {
    const setTitle = vi.fn();
    const setYear = vi.fn();
    const setReleaseType = vi.fn();

    const parsed = applyParsedFilePathFields(
      "/Movies/Dune Part Two (2024)/Dune.Part.Two.2024.2160p.BDRemux.mkv",
      {
        title: "",
        year: null,
        releaseType: "",
        setTitle,
        setYear,
        setReleaseType,
      },
    );

    expect(parsed.year).toBe(2024);
    expect(parsed.releaseType).toBe("bdremux");
    expect(setTitle).toHaveBeenCalled();
    expect(setYear).toHaveBeenCalledWith(2024);
    expect(setReleaseType).toHaveBeenCalledWith("bdremux");
  });

  it("does not overwrite user-provided values", () => {
    const setTitle = vi.fn();
    const setReleaseType = vi.fn();

    applyParsedFilePathFields(
      "/Movies/Dune.Part.Two.2024.2160p.BDRemux.mkv",
      {
        title: "Моё название",
        releaseType: "web-dl",
        setTitle,
        setReleaseType,
      },
    );

    expect(setTitle).not.toHaveBeenCalled();
    expect(setReleaseType).not.toHaveBeenCalled();
  });
});
