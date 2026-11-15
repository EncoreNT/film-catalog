import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createPosterMetadataStore, posterMetadataForPath } from "./poster-metadata";

let dir: string;
beforeEach(async () => { dir = await mkdtemp(path.join(tmpdir(), "poster-metadata-")); });
afterEach(async () => { await rm(dir, { recursive: true, force: true }); });

async function cover(name: string, width = 300, height = 450) {
  const buffer = await sharp({ create: { width, height, channels: 3, background: "#8192a3" } }).png().toBuffer();
  await writeFile(path.join(dir, name), buffer);
  return buffer;
}

describe("poster metadata JSON", () => {
  it("backfills image headers, ignores other files, and reuses unchanged entries", async () => {
    const bytes = await cover("1.png");
    await cover("franchise-2.png", 1600, 900);
    await writeFile(path.join(dir, "notes.txt"), "not an image");
    const store = createPosterMetadataStore(dir);
    const first = await store.refresh();
    expect(Object.keys(first.files)).toEqual(["1.png", "franchise-2.png"]);
    expect(first.files["1.png"]).toMatchObject({ status: "ready", width: 300, height: 450, bytes: bytes.length, format: "png" });
    const raw = await readFile(path.join(dir, "poster-metadata.json"), "utf8");
    expect(await store.refresh()).toEqual(first);
    expect(await readFile(path.join(dir, "poster-metadata.json"), "utf8")).toBe(raw);
    expect(await readFile(path.join(dir, "1.png"))).toEqual(bytes);
  });

  it("updates changed images and removes missing files on refresh", async () => {
    await cover("1.png");
    await cover("2.png");
    const store = createPosterMetadataStore(dir);
    await store.refresh();
    await cover("1.png", 1600, 2400);
    await unlink(path.join(dir, "2.png"));
    const next = await store.refresh();
    expect(next.files["1.png"]).toMatchObject({ width: 1600, height: 2400 });
    expect(next.files["2.png"]).toBeUndefined();
  });

  it("records replacements immediately and removes the previous extension's metadata", async () => {
    await cover("1.jpg");
    const store = createPosterMetadataStore(dir);
    await store.refresh();
    await unlink(path.join(dir, "1.jpg"));
    await cover("1.webp", 1600, 2400);
    const next = await store.update("1.webp");
    expect(next.files["1.jpg"]).toBeUndefined();
    expect(next.files["1.webp"].width).toBe(1600);
  });

  it("rebuilds malformed or obsolete indexes and keeps unreadable files explicit", async () => {
    await cover("1.png");
    await writeFile(path.join(dir, "2.jpg"), "broken JPEG");
    const store = createPosterMetadataStore(dir);
    for (const invalid of ["{broken", '{"version":0,"files":{}}']) {
      await writeFile(path.join(dir, "poster-metadata.json"), invalid);
      const index = await store.refresh();
      expect(index.files["1.png"].status).toBe("ready");
      expect(index.files["2.jpg"]).toMatchObject({ status: "unreadable", width: null, height: null });
    }
  });

  it("merges concurrent writers and refreshes without losing metadata or leaving temporary files", async () => {
    await Promise.all([cover("1.png"), cover("2.png"), cover("3.png")]);
    const a = createPosterMetadataStore(dir);
    const b = createPosterMetadataStore(dir);
    await Promise.all([a.update("1.png"), b.update("2.png"), a.refresh(), b.update("3.png")]);
    const index = JSON.parse(await readFile(path.join(dir, "poster-metadata.json"), "utf8"));
    expect(Object.keys(index.files).sort()).toEqual(["1.png", "2.png", "3.png"]);
    expect((await readdir(dir)).some((name) => name.endsWith(".lock") || name.endsWith(".tmp"))).toBe(false);
  });

  it("records the display orientation and rejects path traversal", async () => {
    const original = await sharp({ create: { width: 900, height: 600, channels: 3, background: "#8192a3" } })
      .withMetadata({ orientation: 6 }).jpeg().toBuffer();
    await writeFile(path.join(dir, "1.jpg"), original);
    const store = createPosterMetadataStore(dir);
    const index = await store.refresh();
    expect(index.files["1.jpg"]).toMatchObject({ width: 600, height: 900 });
    expect(posterMetadataForPath(index.files, "covers/1.jpg")).toBe(index.files["1.jpg"]);
    expect(posterMetadataForPath(index.files, "covers/../1.jpg")).toBeNull();
    expect(posterMetadataForPath(index.files, "elsewhere/1.jpg")).toBeNull();
    await expect(store.update("../1.jpg")).rejects.toThrow("filename");
  });
});
