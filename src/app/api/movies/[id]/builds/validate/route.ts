import { NextRequest, NextResponse } from "next/server";
import {
  jsonError,
  parseRequestBody,
  parseRouteId,
  type RouteContext,
  isErrorResponse,
} from "@/lib/api/api-utils";
import { buildValidateSchema } from "@/lib/api/validators/build";
import {
  validateBuildRecipe,
  ValidationFailed,
} from "@/lib/builds/build-validation";
import {
  assertBuildCapabilities,
  getBuildCapabilities,
} from "@/lib/builds/build-capabilities";

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const movieId = await parseRouteId(context.params);
  if (isErrorResponse(movieId)) return movieId;

  const body = await parseRequestBody(request, buildValidateSchema);
  if (isErrorResponse(body)) return body;

  const caps = await getBuildCapabilities();
  const capError = assertBuildCapabilities(caps);
  if (capError) return jsonError(capError, 503);

  try {
    const validated = await validateBuildRecipe(movieId, body);
    return NextResponse.json({
      ok: true,
      warnings: validated.warnings,
      videoDurationSeconds: validated.videoDurationSeconds,
      videoSourceReleaseId: validated.videoSourceReleaseId,
    });
  } catch (err) {
    if (err instanceof ValidationFailed) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          errors: err.errors,
          warnings: err.warnings,
        },
        { status: 400 },
      );
    }
    throw err;
  }
}
