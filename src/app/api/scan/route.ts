import { NextRequest } from "next/server";
import { setScanRoot } from "@/lib/db/settings";
import { scanDirectory, type ScanProgressEvent } from "@/lib/media/scanner";
import { scanRequestSchema } from "@/lib/api/validators";
import { prisma } from "@/lib/db/prisma";
import { jsonError } from "@/lib/api/api-utils";
import { ndjsonResponse } from "@/lib/api/ndjson-stream";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Некорректный запрос", 400);
  }

  let scanRoot: string;
  let externalStorageId: number | null = null;
  try {
    const parsed = scanRequestSchema.parse(body);
    scanRoot = parsed.scanRoot;
    externalStorageId = parsed.externalStorageId ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid scan root";
    return jsonError(message, 400);
  }

  if (externalStorageId != null) {
    const storage = await prisma.externalStorage.findUnique({
      where: { id: externalStorageId },
    });
    if (!storage) {
      return jsonError("Внешний диск не найден", 400);
    }
  }

  await setScanRoot(scanRoot);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const enqueue = (event: ScanProgressEvent | { type: "error"; message: string }) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await scanDirectory(scanRoot, {
          signal: request.signal,
          onProgress: enqueue,
          externalStorageId,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Scan failed";
        enqueue({ type: "error", message });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed/errored — nothing to do
          }
        }
      }
    },
  });

  return ndjsonResponse(stream);
}
