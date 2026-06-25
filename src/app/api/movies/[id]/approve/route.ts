import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MovieStatus } from "@/generated/prisma/client";
import { movieInclude } from "@/lib/movie-include";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const movieId = parseInt(id, 10);
  if (Number.isNaN(movieId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const movie = await prisma.movie.update({
    where: { id: movieId },
    data: { status: MovieStatus.CATALOG },
    include: movieInclude,
  });

  return NextResponse.json(movie);
}
