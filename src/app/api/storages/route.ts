import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageCreateSchema } from "@/lib/validators";

export async function GET() {
  const storages = await prisma.storage.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: { _count: { select: { releases: true } } },
  });
  return NextResponse.json({ storages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = storageCreateSchema.parse(body);
    const storage = await prisma.storage.create({
      data: { name: data.name, type: data.type, path: data.path ?? null },
      include: { _count: { select: { releases: true } } },
    });
    return NextResponse.json(storage, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Create failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
