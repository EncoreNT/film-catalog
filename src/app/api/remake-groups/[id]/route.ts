import { NextRequest, NextResponse } from "next/server";
import { remakeGroupUpdateSchema } from "@/lib/api/validators";
import { updateRemakeGroup } from "@/lib/remakes/update-remake-group";
import { deleteRemakeGroup } from "@/lib/remakes/delete-remake-group";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  parseRequestBody,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const groupId = await parseRouteId(context.params);
  if (isErrorResponse(groupId)) return groupId;

  const data = await parseRequestBody(request, remakeGroupUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    const group = await updateRemakeGroup(groupId, data);
    return NextResponse.json(group);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось обновить группу";
    return jsonError(message, 400);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const groupId = await parseRouteId(context.params);
  if (isErrorResponse(groupId)) return groupId;

  await deleteRemakeGroup(groupId);
  return NextResponse.json({ ok: true });
}
