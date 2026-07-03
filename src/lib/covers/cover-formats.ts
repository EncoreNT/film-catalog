const COVER_IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".avif",
  ".bmp",
]);

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
