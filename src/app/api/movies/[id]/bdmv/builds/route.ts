import { NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { bdmvRemuxCreateSchema } from "@/lib/api/validators/bdmv";
import { enqueueBdmvRemux } from "@/lib/builds/bdmv-queue";

export async function POST(request: NextRequest, context: RouteContext) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const body = await parseRequestBody(request, bdmvRemuxCreateSchema);
  if (isErrorResponse(body)) return body;

  try {
    const build = await enqueueBdmvRemux(movieId, body);
    return NextResponse.json(build, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("не найден в PATH")) {
      return jsonError(message, 503);
    }
    return mapDomainError(err, "Не удалось поставить сборку в очередь");
  }
}
