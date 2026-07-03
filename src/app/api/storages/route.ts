import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { externalStorageCreateSchema } from "@/lib/api/validators";
import { jsonError } from "@/lib/api/api-utils";

const storageListInclude = {
  _count: { select: { releases: true } },
} as const;

export async function GET() {
  const storages = await prisma.externalStorage.findMany({
    orderBy: { name: "asc" },
    include: storageListInclude,
  });
  return NextResponse.json({ storages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = externalStorageCreateSchema.parse(body);
    const storage = await prisma.externalStorage.create({
      data: { name: data.name, path: data.path ?? null },
      include: storageListInclude,
    });
    return NextResponse.json(storage, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return jsonError(message, 400);
  }
}
