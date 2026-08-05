import { NextResponse } from "next/server";
import { probeRelease } from "@/lib/releases/probe-release";
import {
  isErrorResponse,
  mapDomainError,
  parseReleaseId,
  parseRouteId,
  type ReleaseRouteContext,
} from "@/lib/api/api-utils";

export async function POST(_request: Request, context: ReleaseRouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const releaseId = await parseReleaseId(context.params);
  if (isErrorResponse(releaseId)) return releaseId;

  try {
    const updated = await probeRelease(movieId, releaseId);
    return NextResponse.json(updated);
  } catch (err) {
    return mapDomainError(err, "Не удалось проанализировать файл");
  }
}
