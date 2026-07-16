import { NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  mapDomainError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { prisma } from "@/lib/db/prisma";
import { buildCreateSchema } from "@/lib/api/validators/build";
import { buildInclude, enqueueBuild, assertMovieHasNoActiveBuilds } from "@/lib/builds/build-queue";
import {
  requireWarningAck,
  validateBuildRecipe,
  ValidationFailed,
} from "@/lib/builds/build-validation";
import {
  assertBuildCapabilities,
  getBuildCapabilities,
} from "@/lib/builds/build-capabilities";
import { serializeBuild } from "@/lib/builds/build-serialize";

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const body = await parseRequestBody(request, buildCreateSchema);
  if (isErrorResponse(body)) return body;

  const caps = await getBuildCapabilities();
  const capError = assertBuildCapabilities(caps);
  if (capError) return jsonError(capError, 503);

  try {
    const validated = await validateBuildRecipe(movieId, body);
    requireWarningAck(validated.warnings, body.acknowledgeWarnings);
    await assertMovieHasNoActiveBuilds(movieId);
    const build = await enqueueBuild(movieId, validated);
    const full = await prisma.releaseBuild.findUnique({
      where: { id: build.id },
      include: buildInclude,
    });
    return NextResponse.json(serializeBuild(full!), { status: 201 });
  } catch (err) {
    if (err instanceof ValidationFailed) {
      return NextResponse.json(
        {
          error: err.message,
          errors: err.errors,
          warnings: err.warnings,
        },
        { status: 400 },
      );
    }
    return mapDomainError(err);
  }
}
