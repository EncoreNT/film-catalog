import { describe, expect, it } from "vitest";
import { ApiError, parseApiError } from "@/lib/api/client";

describe("api/client", () => {
  describe("parseApiError", () => {
    it("reads error message from JSON body", async () => {
      const res = new Response(JSON.stringify({ error: "Фильм не найден" }), {
        status: 404,
      });
      await expect(parseApiError(res)).resolves.toBe("Фильм не найден");
    });

    it("falls back when body is not JSON", async () => {
      const res = new Response("not json", { status: 500 });
      await expect(parseApiError(res, "Ошибка запроса")).resolves.toBe(
        "Ошибка запроса",
      );
    });

    it("falls back when JSON has no error field", async () => {
      const res = new Response(JSON.stringify({ message: "x" }), {
        status: 400,
      });
      await expect(parseApiError(res, "Ошибка запроса")).resolves.toBe(
        "Ошибка запроса",
      );
    });
  });

  describe("ApiError", () => {
    it("stores status on the error instance", () => {
      const err = new ApiError("fail", 422);
      expect(err).toBeInstanceOf(Error);
      expect(err.name).toBe("ApiError");
      expect(err.message).toBe("fail");
      expect(err.status).toBe(422);
    });
  });
});
