import { NextRequest, NextResponse } from "next/server";
import { lookupDiskSpaceForPath } from "@/lib/shared/disk-space";
import { displayFilePath } from "@/lib/shared/display-path";
import { jsonError } from "@/lib/api/api-utils";
import { wslDriveUnmountedMessage } from "@/lib/shared/wsl-drive-mount";

export async function GET(request: NextRequest) {
  const rawPath = request.nextUrl.searchParams.get("path");
  if (!rawPath?.trim()) {
    return jsonError("Укажите path", 400);
  }

  const lookup = await lookupDiskSpaceForPath(rawPath);
  if (lookup.kind === "unmounted") {
    return NextResponse.json({
      unmounted: true,
      driveLetter: lookup.drive.letter,
      mountPoint: lookup.drive.mountPoint,
      path: lookup.path,
      pathDisplay: displayFilePath(lookup.path),
      error: wslDriveUnmountedMessage(lookup.drive.letter),
    });
  }

  if (lookup.kind !== "ok") {
    return jsonError("Не удалось определить свободное место", 404);
  }

  return NextResponse.json({
    ...lookup.info,
    pathDisplay: displayFilePath(lookup.info.path),
  });
}
