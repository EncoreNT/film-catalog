import { describe, expect, it } from "vitest";
import sharp from "sharp";
import type { NextRequest } from "next/server";
import { prepareKinoriumPoster } from "./prepare-kinorium-poster";
import { parseCoverUploadRequest } from "./parse-cover-upload";

describe("Kinorium display posters", () => {
  it("reduces a 5250 × 7874 original to a WebP accepted by the existing cover upload", async () => {
    const original = await sharp({ create: {
      width: 5250, height: 7874, channels: 3, background: "#6b95bd",
    } }).jpeg().toBuffer();
    const result = await prepareKinoriumPoster(original);
    expect(result).toMatchObject({ mime: "image/webp", width: 1600, height: 2400 });
    expect((await sharp(result.buffer).metadata()).format).toBe("webp");
    const form = new FormData();
    form.set("cover", new File([new Uint8Array(result.buffer)], "kinorium.webp", { type: result.mime }));
    const request = new Request("http://localhost/api/movies/1/cover", { method: "POST", body: form });
    const upload = await parseCoverUploadRequest(request as NextRequest);
    expect("buffer" in upload).toBe(true);
    if ("buffer" in upload) {
      expect(upload.ext).toBe(".webp");
      expect(upload.buffer.equals(result.buffer)).toBe(true);
    }
  });

  it("uses the long edge for landscape posters without cropping", async () => {
    const original = await sharp({ create: {
      width: 4000, height: 2000, channels: 3, background: "#6b95bd",
    } }).jpeg().toBuffer();
    expect(await prepareKinoriumPoster(original)).toMatchObject({ width: 2400, height: 1200 });
  });

  it("does not enlarge small posters and retains transparency", async () => {
    const original = await sharp({ create: {
      width: 300, height: 450, channels: 4, background: { r: 100, g: 150, b: 200, alpha: 0.5 },
    } }).png().toBuffer();
    const result = await prepareKinoriumPoster(original);
    expect(result).toMatchObject({ width: 300, height: 450 });
    expect((await sharp(result.buffer).metadata()).hasAlpha).toBe(true);
  });

  it("applies EXIF rotation and strips stale orientation metadata", async () => {
    const original = await sharp({ create: {
      width: 1000, height: 500, channels: 3, background: "#6b95bd",
    } }).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const result = await prepareKinoriumPoster(original);
    expect(result).toMatchObject({ width: 500, height: 1000 });
    const metadata = await sharp(result.buffer).metadata();
    expect(metadata.space).toBe("srgb");
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it("converts print CMYK to display sRGB", async () => {
    const original = await sharp({ create: {
      width: 1000, height: 500, channels: 3, background: "#6b95bd",
    } }).toColourspace("cmyk").jpeg().toBuffer();
    expect((await sharp(original).metadata()).space).toBe("cmyk");
    const result = await prepareKinoriumPoster(original);
    expect((await sharp(result.buffer).metadata()).space).toBe("srgb");
  });

  it("rejects corrupt input instead of returning a successful image response", async () => {
    await expect(prepareKinoriumPoster(Buffer.from("not an image"))).rejects.toThrow();
  });
});
