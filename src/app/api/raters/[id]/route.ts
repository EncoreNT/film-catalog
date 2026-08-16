import { NextRequest, NextResponse } from "next/server";
import { raterUpdateSchema } from "@/lib/api/validators";
import { deleteRater, updateRater } from "@/lib/raters/rater-crud";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const raterId = await parseRouteId(context.params);
  if (isErrorResponse(raterId)) return raterId;

  const data = await parseRequestBody(request, raterUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const rater = await updateRater(raterId, data.name);
    return NextResponse.json(rater);
  } catch (err) {
    return mapDomainError(err, "Не удалось обновить оценщика");
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const raterId = await parseRouteId(context.params);
  if (isErrorResponse(raterId)) return raterId;

  try {
    await deleteRater(raterId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapDomainError(err, "Не удалось удалить оценщика");
  }
}
