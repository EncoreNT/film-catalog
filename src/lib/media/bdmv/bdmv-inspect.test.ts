import { describe, expect, it, vi, beforeEach } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const execaMock = vi.fn();

vi.mock("execa", () => ({
  execa: (...args: unknown[]) => execaMock(...args),
}));

vi.mock("@/lib/shared/wsl-drive-mount", () => ({
  assertWslDriveMounted: vi.fn(async () => undefined),
}));

import { inspectBdmv } from "@/lib/media/bdmv/bdmv-inspect";
import { encodeMinimalMpls } from "@/lib/media/bdmv/mpls-fixture";
import { MPLS_TICKS_PER_SECOND } from "@/lib/media/bdmv/mpls-parse";

describe("inspectBdmv", () => {
  beforeEach(() => {
    execaMock.mockReset();
  });

  it("lists playlists and maps mkvmerge identify tracks", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-inspect-"));
    const bdmv = path.join(dir, "BDMV");
    await mkdir(path.join(bdmv, "PLAYLIST"), { recursive: true });
    await mkdir(path.join(bdmv, "STREAM"), { recursive: true });
    await writeFile(
      path.join(bdmv, "STREAM", "00000.m2ts"),
      Buffer.alloc(2048),
    );
    const playlistPath = path.join(bdmv, "PLAYLIST", "00000.mpls");
    await writeFile(
      playlistPath,
      encodeMinimalMpls([
        {
          clipId: "00000",
          inTime: 0,
          outTime: 50 * 60 * MPLS_TICKS_PER_SECOND,
        },
      ]),
    );

    execaMock.mockResolvedValue({
      stdout: JSON.stringify({
        container: { properties: { duration: 3000_000_000_000 } },
        tracks: [
          { id: 0, type: "video", codec: "V_MPEGH/ISO/HEVC", properties: {} },
          {
            id: 1,
            type: "audio",
            codec: "A_TRUEHD",
            properties: { language: "eng", default_track: true },
          },
        ],
      }),
    });

    const result = await inspectBdmv(dir);
    expect(result.playlists).toHaveLength(1);
    expect(result.playlists[0]?.likelyMain).toBe(true);
    expect(result.selected?.tracks.video).toHaveLength(1);
    expect(result.selected?.tracks.audio[0]?.id).toBe(1);
    expect(execaMock).toHaveBeenCalledWith(
      "mkvmerge",
      ["-J", playlistPath],
      expect.objectContaining({ timeout: 60_000 }),
    );
  });
});
