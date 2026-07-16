import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { buildListQuerySchema } from "@/lib/api/validators/build";
import { paginatedResponse } from "@/lib/api/api-utils";
import { buildInclude } from "@/lib/builds/build-queue";
import { serializeBuild } from "@/lib/builds/build-serialize";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const query = buildListQuerySchema.parse(params);
  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(query.movieId ? { movieId: query.movieId } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.releaseBuild.findMany({
      where,
      include: buildInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.releaseBuild.count({ where }),
  ]);

  return paginatedResponse(items.map(serializeBuild), { page, limit, total });
}
