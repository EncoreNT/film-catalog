export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_FETCH_TIMEOUT_MS = 15_000;

const COVER_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".bmp",
]);

/** All allowed cover file extensions (for stale-file cleanup on re-upload). */
export const COVER_IMAGE_EXTENSION_LIST = [
  ...COVER_IMAGE_EXTENSIONS,
] as const;

const COVER_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/bmp",
]);

export function isCoverImageExtension(ext: string): boolean {
  return COVER_IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

export function isCoverImageMime(mime: string): boolean {
  const normalized = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return (
    normalized.startsWith("image/") || COVER_IMAGE_MIMES.has(normalized)
  );
}

export function coverImageExtFromName(fileName: string): string | null {
  const match = fileName.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (!match) return null;
  const ext = `.${match}`;
  return isCoverImageExtension(ext) ? ext : null;
}

export const COVER_MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
};

export const COVER_EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
};

export function coverExtFromMime(mime: string): string | null {
  const normalized = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return COVER_EXT_BY_MIME[normalized] ?? null;
}

/** True when buffer magic bytes match a common raster image format. */
export function isImageBuffer(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }
  // PNG
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  // GIF
  if (buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return true;
  }
  // WebP (RIFF....WEBP)
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }
  // BMP
  if (buffer.subarray(0, 2).toString("ascii") === "BM") {
    return true;
  }
  // AVIF / HEIC (ftyp box)
  if (buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    return brand === "avif" || brand === "avis" || brand === "heic";
  }

  return false;
}
