import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import {
  isErrorResponse,
  jsonError,
  parseRouteId,
  type RouteContext,
} from "@/lib/api/api-utils";
import {
  isCoverUploadError,
  parseCoverUploadRequest,
} from "@/lib/covers/parse-cover-upload";
import { saveFranchiseCover } from "@/lib/covers/save-franchise-cover";
import { serveCoverFile } from "@/lib/covers/serve-cover";

export async function GET(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
    select: { coverPath: true, updatedAt: true },
  });
  if (!franchise?.coverPath) {
    return jsonError("Обложка не найдена", 404);
  }

  return serveCoverFile(request, {
    entityId: franchiseId,
    updatedAt: franchise.updatedAt,
    relativeCoverPath: franchise.coverPath,
    etagPrefix: "franchise-cover",
    onMissingFile: async () => {
      await prisma.franchise.update({
        where: { id: franchiseId },
        data: { coverPath: null },
      });
    },
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const franchiseId = await parseRouteId(context.params);
  if (isErrorResponse(franchiseId)) return franchiseId;

  const franchise = await prisma.franchise.findUnique({
    where: { id: franchiseId },
  });
  if (!franchise) {
    return jsonError("Франшиза не найдена", 404);
  }

  try {
    const payload = await parseCoverUploadRequest(request);
    if (isCoverUploadError(payload)) {
      return jsonError(payload.message, payload.status);
    }
    const updated = await saveFranchiseCover(
      prisma,
      franchiseId,
      payload.buffer,
      payload.ext,
    );
    return NextResponse.json(updated);
  } catch {
    return jsonError("Не удалось сохранить обложку", 500);
  }
}
