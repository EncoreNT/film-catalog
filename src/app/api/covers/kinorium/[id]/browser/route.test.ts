import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const gallery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/covers/kinorium-browser", () => ({ kinoriumBrowser: { gallery } }));

import { POST } from "./route";

beforeEach(() => gallery.mockReset());

describe("Kinorium browser route", () => {
  it("rejects foreign or missing origins before opening a local window", async () => {
    for (const origin of [undefined, "https://example.com"]) {
      const response = await POST(new NextRequest("http://localhost:3000/api/covers/kinorium/776186/browser", {
        method: "POST", headers: origin ? { origin } : {},
      }), { params: Promise.resolve({ id: "776186" }) });
      expect(response.status).toBe(403);
    }
    expect(gallery).not.toHaveBeenCalled();
  });

  it("validates IDs and passes cancellation through for same-origin requests", async () => {
    const request = new NextRequest("http://localhost:3000/api/covers/kinorium/776186/browser", {
      method: "POST", headers: { origin: "http://localhost:3000" },
    });
    expect((await POST(request, { params: Promise.resolve({ id: "invalid" }) })).status).toBe(400);
    expect(gallery).not.toHaveBeenCalled();
    gallery.mockResolvedValue({ status: "available", posters: [] });
    const response = await POST(request, { params: Promise.resolve({ id: "776186" }) });
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(gallery).toHaveBeenCalledWith(776186, request.signal);
  });
});
