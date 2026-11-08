import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/shared/native-path-picker", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/shared/native-path-picker")>();
  return { ...actual, pickPathNative: vi.fn() };
});
import {
  pickPathNative,
  NativePickerCancelledError,
} from "@/lib/shared/native-path-picker";
import { POST } from "./route";

beforeEach(() => vi.clearAllMocks());
describe("POST /api/pick-file", () => {
  it.each(["F:\\Фильмы\\Семь (1995).mkv", "/mnt/f/Фильмы/Семь (1995).mkv"])(
    "normalizes %s into runtime and display paths",
    async (selected) => {
      vi.mocked(pickPathNative).mockResolvedValue(selected);
      const response = await POST();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        path: "/mnt/f/Фильмы/Семь (1995).mkv",
        pathDisplay: "F:\\Фильмы\\Семь (1995).mkv",
      });
      expect(pickPathNative).toHaveBeenCalledWith("file");
    },
  );
  it("returns cancellation without a path or error", async () => {
    vi.mocked(pickPathNative).mockRejectedValue(
      new NativePickerCancelledError(),
    );
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ cancelled: true });
  });
  it("provides a manual path fallback when native selection is unavailable", async () => {
    vi.mocked(pickPathNative).mockResolvedValue(null);
    const response = await POST();
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect((await response.json()).error).toContain("Введите путь вручную");
  });
});
