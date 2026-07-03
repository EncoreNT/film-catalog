import { NextResponse } from "next/server";
import { probeRelease } from "@/lib/releases/probe-release";
import {
  isErrorResponse,
  jsonError,
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
    const message =
      err instanceof Error ? err.message : "Не удалось проанализировать файл";
    const status =
      message === "Релиз не найден"
        ? 404
        : message === "У релиза не указан путь к файлу"
          ? 400
          : 400;
    return jsonError(message, status);
  }
}
