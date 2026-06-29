import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readFile, stat } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { dataPath } from "@/lib/data-path";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api-utils";

const COVERS_DIR = dataPath("covers");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

const MAX_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

async function saveFranchiseCover(
  franchiseId: number,
  buffer: Buffer,
  ext: string,
) {
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `franchise-${franchiseId}${ext}`;
  const coverPath = path.join(COVERS_DIR, coverFileName);
  await writeFile(coverPath, buffer);
  const relativeCoverPath = `covers/${coverFileName}`;
  const updated = await prisma.franchise.update({
    where: { id: franchiseId },
    data: { coverPath: relativeCoverPath },
    select: { id: true, slug: true, coverPath: true, updatedAt: true },
  });

  revalidatePath("/franchises");
  revalidatePath(`/franchises/${updated.slug}`);
  revalidatePath(`/franchises/${updated.slug}/edit`);

  return updated;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { coverPath: true, updatedAt: true },
  });
  if (!franchise?.coverPath) {
    return jsonError("Обложка не найдена", 404);
  }

  const filePath = dataPath(franchise.coverPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream";
  const etag = `"franchise-cover-${franchiseId}-${franchise.updatedAt.getTime()}"`;

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
    await prisma.franchise
      .update({ where: { id: franchiseId }, data: { coverPath: null } })
      .catch(() => {});
    return jsonError("Файл обложки отсутствует", 404);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
  });
  if (!franchise) {
    return jsonError("Франшиза не найдена", 404);
  }

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.startsWith("application/json")) {
      const body = await request.json().catch(() => null);
      const url = typeof body?.url === "string" ? body.url.trim() : "";
      if (!url) {
        return NextResponse.json({ error: "No url" }, { status: 400 });
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        return NextResponse.json({ error: "Некорректный URL" }, { status: 400 });
      }
      if (!/^https?:$/.test(parsedUrl.protocol)) {
        return NextResponse.json(
          { error: "Поддерживаются только http/https ссылки" },
          { status: 400 },
        );
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let resp: Response;
      try {
        resp = await fetch(parsedUrl, {
          signal: controller.signal,
          redirect: "follow",
          headers: { "User-Agent": "film-catalog-cover-fetch/1.0" },
        });
      } catch {
        return NextResponse.json(
          { error: "Не удалось загрузить изображение по ссылке" },
          { status: 502 },
        );
      } finally {
        clearTimeout(timer);
      }
      if (!resp.ok) {
        return NextResponse.json(
          { error: `Источник вернул ${resp.status}` },
          { status: 502 },
        );
      }

      const remoteType = (resp.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      const ext = MIME_TO_EXT[remoteType];
      if (!ext) {
        return NextResponse.json(
          {
            error:
              "По ссылке не изображение (ожидается jpg/png/webp/gif/avif)",
          },
          { status: 415 },
        );
      }

      const arrayBuffer = await resp.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_BYTES) {
        return NextResponse.json(
          { error: `Файл слишком большой (макс. ${MAX_BYTES / 1024 / 1024} МБ)` },
          { status: 413 },
        );
      }
      const buffer = Buffer.from(arrayBuffer);
      const updated = await saveFranchiseCover(franchiseId, buffer, ext);
      return NextResponse.json(updated);
    }

    const formData = await request.formData();
    const file = formData.get("cover");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No cover file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `Файл слишком большой (макс. ${MAX_BYTES / 1024 / 1024} МБ)` },
        { status: 413 },
      );
    }
    const ext = path.extname(file.name) || ".jpg";
    const buffer = Buffer.from(await file.arrayBuffer());
    const updated = await saveFranchiseCover(franchiseId, buffer, ext);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить обложку" },
      { status: 500 },
    );
  }
}
