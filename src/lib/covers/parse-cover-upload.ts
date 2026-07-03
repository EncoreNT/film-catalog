import type { NextRequest } from "next/server";
import path from "path";
import { COVER_MAX_BYTES, fetchRemoteCoverBuffer } from "@/lib/covers/fetch-remote-cover";

export type CoverUploadPayload = { buffer: Buffer; ext: string };
export type CoverUploadError = { message: string; status: number };

export function isCoverUploadError(
  value: CoverUploadPayload | CoverUploadError,
): value is CoverUploadError {
  return "status" in value && "message" in value && !("buffer" in value);
}

export async function parseCoverUploadRequest(
  request: NextRequest,
): Promise<CoverUploadPayload | CoverUploadError> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.startsWith("application/json")) {
    const body = await request.json().catch(() => null);
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!url) {
      return { message: "Не указан URL", status: 400 };
    }
    return fetchRemoteCoverBuffer(url);
  }

  const formData = await request.formData();
  const file = formData.get("cover");
  if (!file || !(file instanceof File)) {
    return { message: "Файл обложки не передан", status: 400 };
  }
  if (file.size > COVER_MAX_BYTES) {
    return {
      message: `Файл слишком большой (макс. ${COVER_MAX_BYTES / 1024 / 1024} МБ)`,
      status: 413,
    };
  }
  const ext = path.extname(file.name) || ".jpg";
  const buffer = Buffer.from(await file.arrayBuffer());
  return { buffer, ext };
}
