import { describe, expect, it, vi, beforeEach } from "vitest";
import { parseNdjsonStream } from "@/lib/api/ndjson-stream";
import { createScanStream } from "@/lib/media/scan-stream";

const { scanDirectory } = vi.hoisted(() => ({
  scanDirectory: vi.fn(),
}));

vi.mock("@/lib/media/scanner", () => ({
  scanDirectory,
}));

describe("createScanStream", () => {
  beforeEach(() => {
    scanDirectory.mockReset();
  });

  it("streams scan progress events as NDJSON", async () => {
    scanDirectory.mockImplementation(
      async (
        _root: string,
        opts: {
          onProgress: (event: { type: string; total?: number }) => void;
        },
      ) => {
        opts.onProgress({ type: "start", total: 1 });
        opts.onProgress({ type: "summary", summary: { created: 0 } } as never);
      },
    );

    const res = createScanStream({
      scanRoot: "/movies",
      externalStorageId: null,
      signal: new AbortController().signal,
    });

    const events: Array<{ type: string }> = [];
    await parseNdjsonStream(res.body!, (event: { type: string }) =>
      events.push(event),
    );

    expect(scanDirectory).toHaveBeenCalledWith(
      "/movies",
      expect.objectContaining({ externalStorageId: null }),
    );
    expect(events.map((e) => e.type)).toEqual(["start", "summary"]);
  });

  it("emits error event when scanDirectory throws", async () => {
    scanDirectory.mockRejectedValue(new Error("disk offline"));

    const res = createScanStream({
      scanRoot: "/movies",
      externalStorageId: 5,
      signal: new AbortController().signal,
    });

    const events: Array<{ type: string; message?: string }> = [];
    await parseNdjsonStream(
      res.body!,
      (event: { type: string; message?: string }) => events.push(event),
    );
    expect(events).toEqual([
      { type: "error", message: "disk offline" },
    ]);
  });
});
