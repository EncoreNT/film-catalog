import { NextRequest, NextResponse } from "next/server";
import { externalStorageUpdateSchema } from "@/lib/api/validators";
import { updateStorageCapacity } from "@/lib/storages/storage-crud";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";

export async function PATCH(request: NextRequest, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;
  const data = await parseRequestBody(request, externalStorageUpdateSchema);
  if (isErrorResponse(data)) return data;
  try {
    return NextResponse.json(
      await updateStorageCapacity(id, data.capacityBytes),
    );
  } catch (err) {
    return mapDomainError(err, "Не удалось сохранить ёмкость диска");
  }
}
