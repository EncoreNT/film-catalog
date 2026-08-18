import { NextRequest, NextResponse } from "next/server";
import { wslDriveMountSchema } from "@/lib/api/validators";
import { jsonError, mapDomainError } from "@/lib/api/api-utils";
import { mountWslDrive } from "@/lib/shared/wsl-drive-mount";

export async function POST(request: NextRequest) {
  let body: { path: string };
  try {
    body = wslDriveMountSchema.parse(await request.json());
  } catch {
    return jsonError("Укажите путь", 400);
  }

  try {
    const drive = await mountWslDrive(body.path);
    return NextResponse.json({
      mounted: true,
      driveLetter: drive.letter,
      mountPoint: drive.mountPoint,
    });
  } catch (err) {
    return mapDomainError(err, "Не удалось подключить диск");
  }
}
