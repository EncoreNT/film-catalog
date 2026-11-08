import { NextRequest, NextResponse } from "next/server";
import {
  createExternalStorage,
  listExternalStorages,
} from "@/lib/storages/storage-crud";
import { externalStorageCreateSchema } from "@/lib/api/validators";
import { jsonError } from "@/lib/api/api-utils";

export async function GET() {
  const storages = await listExternalStorages();
  return NextResponse.json({ storages });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = externalStorageCreateSchema.parse(body);
    const storage = await createExternalStorage(data);
    return NextResponse.json(storage, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Не удалось создать диск";
    return jsonError(message, 400);
  }
}
