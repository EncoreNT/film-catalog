import { NextRequest, NextResponse } from "next/server";
import { ZodError, type z } from "zod";

export type RouteContext = { params: Promise<{ id: string }> };
export type ReleaseRouteContext = {
  params: Promise<{ id: string; releaseId: string }>;
};
export type MovieFranchiseRouteContext = {
  params: Promise<{ id: string; franchiseId: string }>;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseRouteId(
  params: Promise<{ id: string }>,
): Promise<number | NextResponse> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (Number.isNaN(numericId)) {
    return jsonError("Некорректный идентификатор", 400);
  }
  return numericId;
}

export async function parseReleaseId(
  params: Promise<{ releaseId: string }>,
): Promise<number | NextResponse> {
  const { releaseId } = await params;
  const numericId = Number(releaseId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return jsonError("Некорректный id релиза", 400);
  }
  return numericId;
}

export async function parseMovieFranchiseIds(
  params: Promise<{ id: string; franchiseId: string }>,
): Promise<{ movieId: number; franchiseId: number } | NextResponse> {
  const resolved = await params;
  const movieId = parseInt(resolved.id, 10);
  const franchiseId = parseInt(resolved.franchiseId, 10);
  if (Number.isNaN(movieId) || Number.isNaN(franchiseId)) {
    return jsonError("Некорректный идентификатор", 400);
  }
  return { movieId, franchiseId };
}

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

export async function parseRequestBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<z.infer<T> | NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError(
        err.issues[0]?.message ?? "Некорректные данные",
        400,
      );
    }
    throw err;
  }
}

const DOMAIN_ERROR_STATUS: Record<string, number> = {
  "Фильм не найден": 404,
  "Релиз не найден": 404,
  "Франшиза не найдена": 404,
  "Слот не найден": 404,
  "Внешний диск не найден": 400,
  "Файл не найден по указанному пути": 404,
};

export function mapDomainError(
  err: unknown,
  fallback = "Ошибка",
): NextResponse {
  const message = err instanceof Error ? err.message : fallback;
  const status = DOMAIN_ERROR_STATUS[message] ?? 400;
  return jsonError(message, status);
}

export function paginatedResponse<T>(
  items: T[],
  pagination: { page: number; limit: number; total: number },
) {
  return NextResponse.json({
    items,
    pagination: {
      ...pagination,
      pages: Math.ceil(pagination.total / pagination.limit),
    },
  });
}
