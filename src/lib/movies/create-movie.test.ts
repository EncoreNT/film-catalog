import { describe, expect, it, vi, beforeEach } from "vitest";
import { probeOnlyMovie } from "@/lib/movies/create-movie";
import { probeToAudioRows } from "@/lib/media/apply-probe";
import type { ProbeResult } from "@/lib/media/ffprobe";

const probeMediaFileMock = vi.fn();
const readReleaseFileMetaMock = vi.fn();
const assertMovieFileReadableMock = vi.fn();

vi.mock("@/lib/media/ffprobe", () => ({
  probeMediaFile: (...args: unknown[]) => probeMediaFileMock(...args),
}));

vi.mock("@/lib/releases/release-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/releases/release-api")>();
  return {
    ...actual,
    readReleaseFileMeta: (...args: unknown[]) => readReleaseFileMetaMock(...args),
  };
});

vi.mock("@/lib/releases/load-movie-file-meta", () => ({
  loadMovieFileMeta: vi.fn(async () => ({
    assertMovieFileReadable: assertMovieFileReadableMock,
    readMovieFileMeta: vi.fn(),
  })),
}));

/** Typical manual-add probe: RU dub + EN original (no longer tied to a real MKV on disk). */
const manualAddProbeFixture: ProbeResult = {
  durationSeconds: 7380,
  video: {
    streamIndex: 0,
    width: 3840,
    height: 2160,
    resolutionLabel: "4K",
    codec: "hevc",
    hdr: "HDR10",
    fps: "23.976",
    bitrate: 65_000_000,
  },
  audio: [
    {
      streamIndex: 1,
      codec: "truehd",
      profile: "None",
      channels: 8,
      channelLayout: "7.1",
      language: "rus",
      translationType: "dub",
      bitrate: 3_000_000,
      title: "Dub",
      isDefault: true,
    },
    {
      streamIndex: 2,
      codec: "truehd",
      profile: "None",
      channels: 8,
      channelLayout: "7.1",
      language: "eng",
      translationType: "original",
      bitrate: 3_000_000,
      title: "Original",
      isDefault: false,
    },
  ],
  subtitles: [],
};

describe("probeOnlyMovie", () => {
  const filePath = "/movies/sample/warcraft.mkv";

  beforeEach(() => {
    probeMediaFileMock.mockReset();
    readReleaseFileMetaMock.mockReset();
    assertMovieFileReadableMock.mockReset();

    assertMovieFileReadableMock.mockResolvedValue(undefined);
    readReleaseFileMetaMock.mockResolvedValue({
      fileSize: 42_000_000_000,
      fileMtime: new Date("2024-06-01T12:00:00.000Z"),
      fileHash: "deadbeef",
      trimmedPath: filePath,
    });
    probeMediaFileMock.mockResolvedValue(manualAddProbeFixture);
  });

  it("orchestrates probe + file meta and maps audio rows for manual add", async () => {
    const data = await probeOnlyMovie({
      title: "probe",
      probeOnly: true,
      filePath,
    });

    expect(assertMovieFileReadableMock).toHaveBeenCalledWith(filePath);
    expect(probeMediaFileMock).toHaveBeenCalledWith(filePath);
    expect(readReleaseFileMetaMock).toHaveBeenCalledWith(filePath);

    expect(data.durationSeconds).toBe(7380);
    expect(data.fileSize).toBe(42_000_000_000);
    expect(data.fileHash).toBe("deadbeef");
    expect(data.fileMtime).toBe("2024-06-01T12:00:00.000Z");

    const rows = probeToAudioRows(data.audio);
    expect(data.audio).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      language: "rus",
      translationType: "dub",
    });
    expect(rows[1]).toMatchObject({
      language: "eng",
      translationType: "original",
    });
  });

  it("throws when file path is empty", async () => {
    await expect(
      probeOnlyMovie({ title: "probe", probeOnly: true, filePath: "   " }),
    ).rejects.toThrow("Укажите путь к файлу для автозаполнения");
  });

  it("throws when file is not readable", async () => {
    assertMovieFileReadableMock.mockRejectedValue(new Error("ENOENT"));

    await expect(
      probeOnlyMovie({ title: "probe", probeOnly: true, filePath: "/missing.mkv" }),
    ).rejects.toThrow("Файл не найден по указанному пути");
  });
});
