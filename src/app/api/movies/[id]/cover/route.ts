import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const COVERS_DIR = path.join(process.cwd(), "data", "covers");

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const FETCH_TIMEOUT_MS = 15_000;

async function saveCover(movieId: number, buffer: Buffer, ext: string) {
  await mkdir(COVERS_DIR, { recursive: true });
  const coverFileName = `${movieId}${ext}`;
  const coverPath = path.join(COVERS_DIR, coverFileName);
  await writeFile(coverPath, buffer);
  const relativeCoverPath = `covers/${coverFileName}`;
  return prisma.movie.update({
    where: { id: movieId },
    data: { coverPath: relativeCoverPath },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

      const remoteType = (resp.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = MIME_TO_EXT[remoteType];
      if (!ext) {
        return NextResponse.json(
          { error: "По ссылке не изображение (ожидается jpg/png/webp/gif/avif)" },
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
      const updated = await saveCover(movieId, buffer, ext);
      return NextResponse.json(updated);
    }

    // FormData upload (existing behavior)
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
    const updated = await saveCover(movieId, buffer, ext);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Не удалось сохранить обложку" }, { status: 500 });
  }
}
