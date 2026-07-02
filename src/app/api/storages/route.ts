import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { externalStorageCreateSchema } from "@/lib/validators";

export async function GET() {
  const storages = await prisma.externalStorage.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { releases: true } } },
  });
  return NextResponse.json({ storages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = externalStorageCreateSchema.parse(body);
    const storage = await prisma.externalStorage.create({
      data: { name: data.name, path: data.path ?? null },
      include: { _count: { select: { releases: true } } },
    });
    return NextResponse.json(storage, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
