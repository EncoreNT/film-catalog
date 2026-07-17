import { NextRequest, NextResponse } from "next/server";
import {
  getMediaSaveDir,
  getScanRoot,
  mediaSaveDirDisplay,
  scanRootDisplay,
  setMediaSaveDir,
  setScanRoot,
} from "@/lib/db/settings";
import { settingsPatchSchema } from "@/lib/api/validators/settings";
import { jsonError, mapDomainError, parseRequestBody, isErrorResponse } from "@/lib/api/api-utils";

export async function GET() {
  const [scanRoot, mediaSaveDir] = await Promise.all([
    getScanRoot(),
    getMediaSaveDir(),
  ]);

  return NextResponse.json({
    scanRoot,
    scanRootDisplay: scanRootDisplay(scanRoot),
    mediaSaveDir,
    mediaSaveDirDisplay: mediaSaveDirDisplay(mediaSaveDir),
  });
}

export async function PATCH(request: NextRequest) {
  const parsed = await parseRequestBody(request, settingsPatchSchema);
  if (isErrorResponse(parsed)) return parsed;

  try {
    if (parsed.scanRoot != null) {
      await setScanRoot(parsed.scanRoot);
    }
    if (parsed.mediaSaveDir != null) {
      await setMediaSaveDir(parsed.mediaSaveDir);
    }

    const [scanRoot, mediaSaveDir] = await Promise.all([
      getScanRoot(),
      getMediaSaveDir(),
    ]);

    return NextResponse.json({
      scanRoot,
      scanRootDisplay: scanRootDisplay(scanRoot),
      mediaSaveDir,
      mediaSaveDirDisplay: mediaSaveDirDisplay(mediaSaveDir),
    });
  } catch (err) {
    return mapDomainError(err, "Не удалось сохранить настройки");
  }
}
