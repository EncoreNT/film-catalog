import { NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { prisma } from "@/lib/db/prisma";
import { bdmvInspectSchema } from "@/lib/api/validators/bdmv";
import { inspectBdmv } from "@/lib/media/bdmv/bdmv-inspect";
import { getBuildCapabilities } from "@/lib/builds/build-capabilities";

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const movie = await prisma.movie.findUnique({
    where: { id: movieId },
    select: { id: true },
  });
  if (!movie) return jsonError("Фильм не найден", 404);

  const body = await parseRequestBody(request, bdmvInspectSchema);
  if (isErrorResponse(body)) return body;

  const caps = await getBuildCapabilities();
  if (!caps.mkvmerge.available) {
    return jsonError("mkvmerge не найден в PATH", 503);
  }

  try {
    const result = await inspectBdmv(body.bdmvPath, body.playlistPath);
    return NextResponse.json(result);
  } catch (err) {
    return mapDomainError(err, "Не удалось прочитать BDMV");
  }
}
