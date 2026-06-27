import { execa } from "execa";
import { mkdtemp, readFile, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

interface MkvAttachment {
  id: number;
  content_type: string;
  file_name: string;
}

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/bmp": ".bmp",
};

function extForAttachment(a: MkvAttachment): string {
  const mime = (a.content_type ?? "").toLowerCase();
  if (MIME_TO_EXT[mime]) return MIME_TO_EXT[mime];
  const fromName = a.file_name?.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  if (fromName) return `.${fromName}`;
  return ".jpg";
}

/**
 * List attachments embedded in an MKV file via `mkvmerge -J` (JSON
 * identification). This only reads the container headers, so it is fast even
 * on large files on a slow mount. Returns [] for non-MKV files or on failure.
 */
async function listAttachments(
  filePath: string,
  signal?: AbortSignal,
): Promise<MkvAttachment[]> {
  const { stdout } = await execa("mkvmerge", ["-J", filePath], {
    cancelSignal: signal,
    timeout: 60_000,
  });
  const data = JSON.parse(stdout) as {
    attachments?: { id: number; content_type?: string; file_name?: string }[];
  };
  return (data.attachments ?? []).map((a) => ({
    id: a.id,
    content_type: a.content_type ?? "",
    file_name: a.file_name ?? "",
  }));
}

/**
 * Extract the first embedded image attachment from an MKV file using
 * `mkvextract attachments <file> <id>:<out>`. mkvextract reads only the
 * attachment payload (no stream decode), so it is fast — a poster comes out
 * in well under a second even on a network mount, where the previous
 * ffmpeg-based extraction stalled for minutes.
 *
 * Returns null when there are no image attachments, the file isn't MKV, or
 * mkvtoolnix isn't available. The caller treats a null result as "no embedded
 * cover" and proceeds without one.
 */
export async function extractFirstMkvAttachment(
  filePath: string,
  signal?: AbortSignal,
): Promise<{ buffer: Buffer; ext: string } | null> {
  let attachments: MkvAttachment[];
  try {
    attachments = await listAttachments(filePath, signal);
  } catch {
    return null;
  }
  if (attachments.length === 0) return null;

  const firstImage =
    attachments.find((a) => a.content_type.toLowerCase().startsWith("image/")) ??
    attachments[0];

  const tmp = await mkdtemp(path.join(tmpdir(), "film-cover-"));
  const outPath = path.join(tmp, `attachment${extForAttachment(firstImage)}`);
  try {
    await execa(
      "mkvextract",
      ["attachments", filePath, `${firstImage.id}:${outPath}`],
      { cancelSignal: signal, timeout: 60_000 },
    );
    const buffer = await readFile(outPath);
    if (!buffer || buffer.length === 0) return null;
    return { buffer, ext: path.extname(outPath) || ".jpg" };
  } catch {
    return null;
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

export async function isMkvtoolnixAvailable(): Promise<boolean> {
  try {
    await execa("mkvmerge", ["--version"]);
    return true;
  } catch {
    return false;
  }
}
