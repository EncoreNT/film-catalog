import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const movie = await prisma.movie.findUnique({ where: { id: movieId } });
  if (!movie?.coverPath) {
    return NextResponse.json({ error: "No cover" }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "data", movie.coverPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Cover file missing" }, { status: 404 });
  }
}
