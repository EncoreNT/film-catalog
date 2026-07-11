import { describe, expect, it } from "vitest";
import { probeOnlyMovie } from "@/lib/movies/create-movie";
import { parseMoviePath } from "@/lib/media/name-parser";
import { probeToAudioRows } from "@/lib/media/apply-probe";

describe("manual add probe integration", () => {
  it("probes warcraft file and maps audio rows", async () => {
    const path = "/mnt/d/Фильмы/4K/Варкрафт.mkv";
    const parsed = parseMoviePath(path);
    expect(parsed.releaseType).toBeNull();

    const data = await probeOnlyMovie({
      title: "probe",
      probeOnly: true,
      filePath: path,
    });

    const rows = probeToAudioRows(data.audio);
    expect(data.audio.length).toBe(2);
    expect(rows[0]).toMatchObject({
      language: "rus",
      translationType: "dub",
    });
    expect(rows[1]).toMatchObject({
      language: "eng",
      translationType: "original",
    });
  });
});
