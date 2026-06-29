import {
  coverImageExtFromName,
  isCoverImageExtension,
  isCoverImageMime,
} from "./cover-formats";

const NON_IMAGE_EXTENSIONS = new Set([
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  ".ttc",
  ".srt",
  ".ass",
  ".ssa",
  ".sub",
  ".sup",
  ".xml",
  ".txt",
]);

const FONT_MIME_PREFIXES = [
  "application/font",
  "application/x-font",
  "application/vnd.ms-fontobject",
  "font/",
];

export interface MkvAttachment {
  id: number;
  content_type: string;
  file_name: string;
}

function attachmentExtension(fileName: string): string {
  const match = fileName.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1].toLowerCase() : "";
}

function isFontMime(mime: string): boolean {
  const normalized = mime.split(";")[0]?.trim().toLowerCase() ?? "";
  return FONT_MIME_PREFIXES.some(
    (prefix) =>
      normalized.startsWith(prefix) || normalized.includes("truetype"),
  );
}

/** Metadata heuristic — skips fonts/subtitles, accepts image MIME or extension. */
export function isMkvImageAttachment(attachment: MkvAttachment): boolean {
  const ext = attachmentExtension(attachment.file_name);
  if (ext && NON_IMAGE_EXTENSIONS.has(ext)) return false;
  if (isFontMime(attachment.content_type)) return false;
  if (isCoverImageMime(attachment.content_type)) return true;
  return coverImageExtFromName(attachment.file_name) != null;
}

/** First attachment in MKV order that looks like an image (by metadata). */
export function pickMkvImageAttachment(
  attachments: MkvAttachment[],
): MkvAttachment | null {
  for (const attachment of attachments) {
    if (isMkvImageAttachment(attachment)) return attachment;
  }
  return null;
}

/** All image-like attachments in MKV order (for sequential extraction). */
export function listMkvImageAttachments(
  attachments: MkvAttachment[],
): MkvAttachment[] {
  return attachments.filter(isMkvImageAttachment);
}

export function mkvAttachmentCoverExt(attachment: MkvAttachment): string {
  const fromName = coverImageExtFromName(attachment.file_name);
  if (fromName) return fromName;
  const mime = attachment.content_type.split(";")[0]?.trim().toLowerCase() ?? "";
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
    "image/bmp": ".bmp",
  };
  if (mimeToExt[mime]) return mimeToExt[mime];
  return ".jpg";
}

export function assertCoverImageExtension(ext: string): void {
  if (!isCoverImageExtension(ext)) {
    throw new Error(`Недопустимый формат обложки: ${ext}`);
  }
}
