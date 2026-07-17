import { NextRequest } from "next/server";
import { setScanRoot } from "@/lib/db/settings";
import { scanRequestSchema } from "@/lib/api/validators";
import { resolveRuntimePath } from "@/lib/shared/display-path";
import { prisma } from "@/lib/db/prisma";
import { createScanStream } from "@/lib/media/scan-stream";
import {
  jsonError,
  parseRequestBody,
  isErrorResponse,
} from "@/lib/api/api-utils";

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
