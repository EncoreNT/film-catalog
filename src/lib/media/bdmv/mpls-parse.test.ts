import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { MPLS_TICKS_PER_SECOND, parseMpls } from "@/lib/media/bdmv/mpls-parse";
import { encodeMinimalMpls } from "@/lib/media/bdmv/mpls-fixture";

describe("parseMpls", () => {
  it("reads clip ids and duration from a minimal playlist", () => {
    const durationTicks = 90 * 60 * MPLS_TICKS_PER_SECOND;
    const buffer = encodeMinimalMpls([
      { clipId: "00001", inTime: 0, outTime: durationTicks },
    ]);
    const parsed = parseMpls(buffer);
    expect(parsed.clips).toEqual(["00001"]);
    expect(parsed.durationSeconds).toBe(90 * 60);
  });

  it("sums multiple play items", () => {
    const buffer = encodeMinimalMpls([
      { clipId: "00000", inTime: 0, outTime: 45_000 },
      { clipId: "00001", inTime: 0, outTime: 90_000 },
    ]);
    const parsed = parseMpls(buffer);
    expect(parsed.clips).toEqual(["00000", "00001"]);
    expect(parsed.durationSeconds).toBe(3);
  });

  it("rejects non-MPLS magic", () => {
    expect(() => parseMpls(Buffer.from("XXXX0200XXXX"))).toThrow(/MPLS/);
  });
});

describe("encodeMinimalMpls fixture", () => {
  it("can be written as a binary fixture", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "mpls-"));
    const file = path.join(dir, "minimal.mpls");
    const buffer = encodeMinimalMpls([
      { clipId: "00000", inTime: 0, outTime: 45_000 * 120 },
    ]);
    await mkdir(dir, { recursive: true });
    await writeFile(file, buffer);
    const parsed = parseMpls(await import("node:fs/promises").then((fs) => fs.readFile(file)));
    expect(parsed.durationSeconds).toBe(120);
  });
});
