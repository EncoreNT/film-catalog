import { describe, expect, it } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  isErrorResponse,
  jsonError,
  mapDomainError,
  paginatedResponse,
  parseMovieFranchiseIds,
  parseReleaseId,
  parseRequestBody,
  parseRouteId,
} from "@/lib/api/api-utils";

async function readJson<T>(res: NextResponse): Promise<T> {
  return (await res.json()) as T;
}

describe("api-utils", () => {
  describe("jsonError", () => {
    it("returns JSON body with error message and status", async () => {
      const res = jsonError("boom", 418);
      expect(res.status).toBe(418);
      await expect(readJson<{ error: string }>(res)).resolves.toEqual({
        error: "boom",
      });
    });
  });

  describe("parseRouteId", () => {
    it("parses numeric id", async () => {
      await expect(parseRouteId(Promise.resolve({ id: "42" }))).resolves.toBe(
        42,
      );
    });

    it("returns 400 for non-numeric id", async () => {
      const res = await parseRouteId(Promise.resolve({ id: "abc" }));
      expect(isErrorResponse(res)).toBe(true);
      if (isErrorResponse(res)) {
        expect(res.status).toBe(400);
        await expect(readJson(res)).resolves.toEqual({
          error: "Некорректный идентификатор",
        });
      }
    });
  });

  describe("parseReleaseId", () => {
    it("accepts positive integers", async () => {
      await expect(
        parseReleaseId(Promise.resolve({ releaseId: "7" })),
      ).resolves.toBe(7);
    });

    it("rejects zero and non-integers", async () => {
      const zero = await parseReleaseId(Promise.resolve({ releaseId: "0" }));
      const float = await parseReleaseId(
        Promise.resolve({ releaseId: "1.5" }),
      );
      expect(isErrorResponse(zero)).toBe(true);
      expect(isErrorResponse(float)).toBe(true);
    });
  });

  describe("parseMovieFranchiseIds", () => {
    it("parses both ids", async () => {
      await expect(
        parseMovieFranchiseIds(
          Promise.resolve({ id: "10", franchiseId: "3" }),
        ),
      ).resolves.toEqual({ movieId: 10, franchiseId: 3 });
    });

    it("returns 400 when either id is invalid", async () => {
      const res = await parseMovieFranchiseIds(
        Promise.resolve({ id: "x", franchiseId: "3" }),
      );
      expect(isErrorResponse(res)).toBe(true);
    });
  });

  describe("isErrorResponse", () => {
    it("narrows NextResponse errors", () => {
      expect(isErrorResponse(jsonError("x", 400))).toBe(true);
      expect(isErrorResponse(42)).toBe(false);
    });
  });

  describe("parseRequestBody", () => {
    const schema = z.object({ title: z.string().min(1) });

    it("parses valid JSON body", async () => {
      const req = new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ title: "Dune" }),
        headers: { "Content-Type": "application/json" },
      });
      await expect(parseRequestBody(req, schema)).resolves.toEqual({
        title: "Dune",
      });
    });

    it("returns 400 for invalid JSON", async () => {
      const req = new NextRequest("http://localhost/api", {
        method: "POST",
        body: "not-json",
      });
      const res = await parseRequestBody(req, schema);
      expect(isErrorResponse(res)).toBe(true);
      if (isErrorResponse(res)) {
        expect(res.status).toBe(400);
      }
    });

    it("returns 400 for schema validation errors", async () => {
      const req = new NextRequest("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ title: "" }),
      });
      const res = await parseRequestBody(req, schema);
      expect(isErrorResponse(res)).toBe(true);
    });
  });

  describe("mapDomainError", () => {
    it("maps known domain messages to status codes", async () => {
      const res = mapDomainError(new Error("Фильм не найден"));
      expect(res.status).toBe(404);
      await expect(readJson(res)).resolves.toEqual({
        error: "Фильм не найден",
      });
    });

    it("defaults unknown errors to 400", async () => {
      const res = mapDomainError(new Error("что-то странное"));
      expect(res.status).toBe(400);
    });

    it("uses fallback for non-Error values", async () => {
      const res = mapDomainError("oops", "Ошибка");
      await expect(readJson(res)).resolves.toEqual({ error: "Ошибка" });
    });
  });

  describe("paginatedResponse", () => {
    it("adds pages count to pagination metadata", async () => {
      const res = paginatedResponse([{ id: 1 }], {
        page: 2,
        limit: 10,
        total: 25,
      });
      await expect(readJson(res)).resolves.toEqual({
        items: [{ id: 1 }],
        pagination: { page: 2, limit: 10, total: 25, pages: 3 },
      });
    });
  });
});
