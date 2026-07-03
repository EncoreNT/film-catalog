import { scanDirectory, type ScanProgressEvent } from "@/lib/media/scanner";
import { ndjsonResponse } from "@/lib/api/ndjson-stream";

interface ScanStreamOptions {
  scanRoot: string;
  externalStorageId: number | null;
  signal: AbortSignal;
}

export function createScanStream({
  scanRoot,
  externalStorageId,
  signal,
}: ScanStreamOptions): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const enqueue = (
        event: ScanProgressEvent | { type: "error"; message: string },
      ) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
        }
      };

      try {
        await scanDirectory(scanRoot, {
          signal,
          onProgress: enqueue,
          externalStorageId,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Ошибка сканирования";
        enqueue({ type: "error", message });
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
  });

  return ndjsonResponse(stream);
}
