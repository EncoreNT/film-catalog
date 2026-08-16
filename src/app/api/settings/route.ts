import { NextRequest, NextResponse } from "next/server";
import { settingsUpdateSchema } from "@/lib/api/validators";
import {
  getAppSettingsSnapshot,
  setBuildTranscodeConcurrency,
  setCatalogDefaultSort,
  setCatalogPageSize,
  setDefaultAc3Bitrate,
  setDefaultEac3Bitrate,
  setExportTargetDir,
  setScanRoot,
} from "@/lib/db/settings";
import {
  isErrorResponse,
  mapDomainError,
  parseRequestBody,
} from "@/lib/api/api-utils";

export async function GET() {
  const settings = await getAppSettingsSnapshot();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const data = await parseRequestBody(request, settingsUpdateSchema);
  if (isErrorResponse(data)) return data;

  try {
    if (data.scanRoot !== undefined) {
      if (data.scanRoot) {
        await setScanRoot(data.scanRoot);
      }
    }
    if (data.exportTargetDir !== undefined) {
      if (data.exportTargetDir) {
        await setExportTargetDir(data.exportTargetDir);
      }
    }
    if (data.catalogPageSize !== undefined) {
      await setCatalogPageSize(data.catalogPageSize);
    }
    if (data.catalogDefaultSort !== undefined) {
      await setCatalogDefaultSort(data.catalogDefaultSort);
    }
    if (data.buildTranscodeConcurrency !== undefined) {
      await setBuildTranscodeConcurrency(data.buildTranscodeConcurrency);
    }
    if (data.defaultAc3Bitrate !== undefined) {
      await setDefaultAc3Bitrate(data.defaultAc3Bitrate);
    }
    if (data.defaultEac3Bitrate !== undefined) {
      await setDefaultEac3Bitrate(data.defaultEac3Bitrate);
    }

    const settings = await getAppSettingsSnapshot();
    return NextResponse.json(settings);
  } catch (err) {
    return mapDomainError(err, "Не удалось сохранить настройки");
  }
}
