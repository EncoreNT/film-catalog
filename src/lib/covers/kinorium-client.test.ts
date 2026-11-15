import { afterEach, describe, expect, it, vi } from "vitest";
import { createKinoriumClient } from "./kinorium-client";
import { COVER_MAX_BYTES } from "./cover-formats";

afterEach(() => vi.useRealTimers());

describe("Kinorium client", () => {
  it("encodes search, sends AJAX headers and caches successful responses", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ list: [] }));
    const client = createKinoriumClient(fetcher);
    await client.search("Кот & сапоги", 2022);
    await client.search("Кот & сапоги", 2022);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [url, options] = fetcher.mock.calls[0];
    expect(new URL(String(url)).searchParams.get("str")).toBe("Кот & сапоги");
    expect(options).toMatchObject({
      redirect: "error",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
  });

  it("does not cache a failed search as an empty result", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("<title>Checking browser</title>"))
      .mockResolvedValueOnce(Response.json({ list: [] }));
    const client = createKinoriumClient(fetcher);
    await expect(client.search("test")).rejects.toThrow(
      "Поиск Kinorium сейчас недоступен",
    );
    await expect(client.search("test")).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("returns a recoverable blocked gallery and expires its short cache", async () => {
    vi.useFakeTimers();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response("", { status: 403 }));
    const client = createKinoriumClient(fetcher);
    await expect(client.gallery(776186)).resolves.toEqual({
      status: "blocked",
      posters: [],
    });
    await client.gallery(776186);
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(61_000);
    await client.gallery(776186);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("never fetches an arbitrary image URL and preserves original bytes", async () => {
    const bytes = new Uint8Array([255, 216, 255, 224, 1, 2, 3]);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(bytes, { headers: { "Content-Type": "image/jpeg" } }),
      );
    const client = createKinoriumClient(fetcher);
    await expect(client.image("http://127.0.0.1/secret")).rejects.toMatchObject(
      { status: 400 },
    );
    expect(fetcher).not.toHaveBeenCalled();
    const result = await client.image(
      "https://ru-images.kinorium.com/movie/original/1.jpg",
    );
    expect(result.buffer).toEqual(Buffer.from(bytes));
    expect(result.mime).toBe("image/jpeg");
  });

  it("rejects HTML images and oversized streamed responses without a content-length", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response("captcha", { headers: { "Content-Type": "text/html" } }),
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array(COVER_MAX_BYTES + 1), {
          headers: { "Content-Type": "image/jpeg" },
        }),
      );
    const client = createKinoriumClient(fetcher);
    const url = "https://images.kinorium.com/movie/original/1.jpg";
    await expect(client.image(url)).rejects.toThrow("вместо изображения");
    await expect(client.image(url)).rejects.toMatchObject({ status: 413 });
  });

  it("times out through the response body, not just until headers arrive", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      async (_url, options) =>
        new Response(
          new ReadableStream({
            start(controller) {
              options?.signal?.addEventListener("abort", () =>
                controller.error(new Error("aborted")),
              );
            },
          }),
        ),
    );
    const pending = createKinoriumClient(fetcher).search("test");
    const assertion = expect(pending).rejects.toThrow("не ответил вовремя");
    await vi.advanceTimersByTimeAsync(12_001);
    await assertion;
  });
});
