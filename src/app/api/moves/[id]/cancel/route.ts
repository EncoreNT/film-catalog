import { NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { requestMoveCancel } from "@/lib/releases/move-queue";
import { serializeMove } from "@/lib/releases/move-serialize";

export async function POST(_request: Request, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;

  try {
    const job = await requestMoveCancel(id);
    return NextResponse.json(serializeMove(job));
  } catch (err) {
    return mapDomainError(err, "Не удалось отменить перемещение");
  }
}
