import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bulkActionSchema } from "@/lib/validators";
import { MovieStatus } from "@/generated/prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, action } = bulkActionSchema.parse(body);

    const status =
      action === "approve" ? MovieStatus.CATALOG : MovieStatus.EXCLUDED;

    const result = await prisma.movie.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    return NextResponse.json({ updated: result.count });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk action failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
