import { describe, expect, it, vi } from "vitest";
import {
  applyParsedFilePathFields,
  applyProbeToTrackEditor,
  type ProbeTrackEditor,
} from "./useProbeFile";
import { emptyVideoFieldState } from "@/lib/movies/movie-form-types";
import type { ProbeResult } from "@/lib/media/ffprobe";

function editor() {
  return {
    setDurationSeconds: vi.fn(),
    setVideo: vi.fn(),
    setAudioRowsFromProbe: vi.fn(),
    setSubtitleRowsFromProbe: vi.fn(),
    setPendingFileMeta: vi.fn(),
  } satisfies ProbeTrackEditor;
}

describe("applyProbeToTrackEditor", () => {
  it("clears old fields and tracks when the newly read file has none", () => {
    const target = editor();
    applyProbeToTrackEditor(
      {
        durationSeconds: null,
        video: null,
        audio: [],
        subtitles: [],
      } as ProbeResult,
      target,
    );
    expect(target.setDurationSeconds).toHaveBeenCalledWith(null);
    expect(target.setAudioRowsFromProbe).toHaveBeenCalledWith([]);
    expect(target.setSubtitleRowsFromProbe).toHaveBeenCalledWith([]);
    expect(target.setPendingFileMeta).toHaveBeenCalledWith(null);
    const replace = target.setVideo.mock.calls[0][0];
    expect(
      replace({
        ...emptyVideoFieldState(),
        hdr: "DV:P8",
        codec: "hevc",
        width: 3840,
      }),
    ).toEqual(emptyVideoFieldState());
  });
  it("replaces duration and file metadata with the new read", () => {
    const target = editor();
    const meta = {
      fileSize: 1024,
      fileMtime: "2026-11-08",
      fileDownloadedAt: "2026-11-08",
      fileHash: "new",
    };
    applyProbeToTrackEditor(
      {
        durationSeconds: 7200,
        video: null,
        audio: [],
        subtitles: [],
        ...meta,
      } as ProbeResult & typeof meta,
      target,
    );
    expect(target.setDurationSeconds).toHaveBeenCalledWith(7200);
    expect(target.setPendingFileMeta).toHaveBeenCalledWith(meta);
  });
});

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

    applyParsedFilePathFields("/Movies/Dune.Part.Two.2024.2160p.BDRemux.mkv", {
      title: "Моё название",
      releaseType: "web-dl",
      setTitle,
      setReleaseType,
    });

    expect(setTitle).not.toHaveBeenCalled();
    expect(setReleaseType).not.toHaveBeenCalled();
  });
});
