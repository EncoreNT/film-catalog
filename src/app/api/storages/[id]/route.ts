import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { storageUpdateSchema } from "@/lib/validators";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const storageId = parseInt(id, 10);
  if (Number.isNaN(storageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await request.json();
    const data = storageUpdateSchema.parse(body);
    const storage = await prisma.storage.update({
      where: { id: storageId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.path !== undefined ? { path: data.path } : {}),
      },
    });
    return NextResponse.json(storage);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const storageId = parseInt(id, 10);
  if (Number.isNaN(storageId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await prisma.storage.delete({ where: { id: storageId } });
  return NextResponse.json({ ok: true });
}
