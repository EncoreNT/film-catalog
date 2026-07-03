import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";
import { dataPath } from "@/lib/db/data-path";
import { jsonError } from "@/lib/api/api-utils";
import {
  COVER_MIME_BY_EXT,
  isCoverImageExtension,
} from "@/lib/covers/cover-formats";

export type ServeCoverOptions = {
  entityId: number;
  updatedAt: Date;
  relativeCoverPath: string;
  etagPrefix: string;
  validateExtension?: boolean;
  onMissingFile?: () => Promise<void>;
  onInvalidExtension?: () => Promise<void>;
};

export async function serveCoverFile(
  request: NextRequest,
  options: ServeCoverOptions,
): Promise<NextResponse> {
  const {
    entityId,
    updatedAt,
    relativeCoverPath,
    etagPrefix,
    validateExtension = false,
    onMissingFile,
    onInvalidExtension,
  } = options;

  const filePath = dataPath(relativeCoverPath);
  const ext = path.extname(filePath).toLowerCase();

  if (validateExtension && !isCoverImageExtension(ext)) {
    await onInvalidExtension?.().catch(() => {});
    return jsonError("Файл обложки имеет неподдерживаемый формат", 404);
  }

  const contentType = COVER_MIME_BY_EXT[ext] ?? "application/octet-stream";
  const etag = `"${etagPrefix}-${entityId}-${updatedAt.getTime()}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  }

  try {
    const [buffer, fileStat] = await Promise.all([
      readFile(filePath),
      stat(filePath),
    ]);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, must-revalidate",
        ETag: etag,
        "Last-Modified": fileStat.mtime.toUTCString(),
      },
    });
  } catch {
    await onMissingFile?.().catch(() => {});
    return jsonError("Файл обложки отсутствует", 404);
  }
}
