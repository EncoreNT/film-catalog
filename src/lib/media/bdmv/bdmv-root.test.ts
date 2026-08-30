import { describe, expect, it } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveBdmvRoot } from "@/lib/media/bdmv/bdmv-root";

async function makeBdmvTree(root: string, streamBytes = 100) {
  const bdmv = path.join(root, "BDMV");
  await mkdir(path.join(bdmv, "PLAYLIST"), { recursive: true });
  await mkdir(path.join(bdmv, "STREAM"), { recursive: true });
  await writeFile(path.join(bdmv, "STREAM", "00000.m2ts"), Buffer.alloc(streamBytes));
  return bdmv;
}

describe("resolveBdmvRoot", () => {
  it("resolves a movie folder that contains BDMV", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-movie-"));
    const bdmv = await makeBdmvTree(dir);
    const resolved = await resolveBdmvRoot(dir);
    expect(resolved.bdmvRoot).toBe(bdmv);
    expect(path.basename(resolved.playlistDir).toUpperCase()).toBe("PLAYLIST");
  });

  it("resolves the BDMV directory itself", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-root-"));
    const bdmv = await makeBdmvTree(dir);
    const resolved = await resolveBdmvRoot(bdmv);
    expect(resolved.bdmvRoot).toBe(bdmv);
  });

  it("resolves PLAYLIST as the BDMV parent", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-pl-"));
    const bdmv = await makeBdmvTree(dir);
    const resolved = await resolveBdmvRoot(path.join(bdmv, "PLAYLIST"));
    expect(resolved.bdmvRoot).toBe(bdmv);
  });

  it("picks the larger STREAM when several BDMV trees exist", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-multi-"));
    await makeBdmvTree(path.join(dir, "disc-a"), 10);
    const big = await makeBdmvTree(path.join(dir, "disc-b"), 10_000);
    const resolved = await resolveBdmvRoot(dir);
    expect(resolved.bdmvRoot).toBe(big);
    expect(resolved.warnings.some((w) => w.code === "multiple-bdmv")).toBe(true);
  });

  it("rejects an ISO path", async () => {
    await expect(resolveBdmvRoot("/tmp/movie.iso")).rejects.toThrow(/распакованная/);
  });

  it("rejects a folder without BDMV", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "bdmv-empty-"));
    await expect(resolveBdmvRoot(dir)).rejects.toThrow(/нет каталога BDMV/);
  });
});
