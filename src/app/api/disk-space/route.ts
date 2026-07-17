import { NextRequest, NextResponse } from "next/server";
import { getDiskSpaceForPath } from "@/lib/shared/disk-space";
import { displayFilePath } from "@/lib/shared/display-path";
import { jsonError } from "@/lib/api/api-utils";

export async function GET(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get("path");
  if (!rawPath?.trim()) {
    return jsonError("Укажите path", 400);
  }

  const info = await getDiskSpaceForPath(rawPath);
  if (!info) {
    return jsonError("Не удалось определить свободное место", 404);
  }

  return NextResponse.json({
    ...info,
    pathDisplay: displayFilePath(info.path),
  });
}
