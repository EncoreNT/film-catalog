import { NextRequest, NextResponse } from "next/server";
import { getScanRoot, scanRootDisplay, setScanRoot } from "@/lib/db/settings";
import { scanRequestSchema, scanRootSchema } from "@/lib/api/validators";
import { resolveRuntimePath } from "@/lib/shared/display-path";
import { prisma } from "@/lib/db/prisma";
import { createScanStream } from "@/lib/media/scan-stream";
import {
  jsonError,
  mapDomainError,
  parseRequestBody,
  isErrorResponse,
} from "@/lib/api/api-utils";

export async function GET() {
  const scanRoot = await getScanRoot();
  return NextResponse.json({
    scanRoot,
    scanRootDisplay: scanRootDisplay(scanRoot),
  });
}

export async function PUT(request: NextRequest) {
  const parsed = await parseRequestBody(request, scanRootSchema);
  if (isErrorResponse(parsed)) return parsed;

  try {
    await setScanRoot(parsed.scanRoot);
    const scanRoot = await getScanRoot();
    return NextResponse.json({
      scanRoot,
      scanRootDisplay: scanRootDisplay(scanRoot),
    });
  } catch (err) {
    return mapDomainError(err, "Не удалось сохранить папку сканирования");
  }
}

export async function POST(request: NextRequest) {
  const parsed = await parseRequestBody(request, scanRequestSchema);
  if (isErrorResponse(parsed)) return parsed;

  const { scanRoot, externalStorageId = null } = parsed;
  const runtimeScanRoot = resolveRuntimePath(scanRoot);

  if (externalStorageId != null) {
    const storage = await prisma.externalStorage.findUnique({
      where: { id: externalStorageId },
    });
    if (!storage) {
      return jsonError("Внешний диск не найден", 400);
    }
  }

  await setScanRoot(runtimeScanRoot);

  return createScanStream({
    scanRoot: runtimeScanRoot,
    externalStorageId,
    signal: request.signal,
  });
}
