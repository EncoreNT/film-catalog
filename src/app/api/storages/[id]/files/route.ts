import { NextResponse } from "next/server";
import { isErrorResponse, jsonError, parseRouteId, type RouteContext } from "@/lib/api/api-utils";
import { listStorageFiles } from "@/lib/storages/storage-crud";

export async function GET(_request: Request, context: RouteContext) {
  const id = await parseRouteId(context.params);
  if (isErrorResponse(id)) return id;
  const files = await listStorageFiles(id);
  return files === null
    ? jsonError("Внешний диск не найден", 404)
    : NextResponse.json(files);
}
