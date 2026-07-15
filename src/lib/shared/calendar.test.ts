import { describe, expect, it } from "vitest";
import {
  addMonths,
  buildMonthGrid,
  formatDisplayDate,
  isSameDay,
  parseISODate,
  toISODate,
} from "@/lib/shared/calendar";

describe("calendar", () => {
  describe("parseISODate / toISODate", () => {
    it("round-trips a valid ISO date", () => {
      const date = parseISODate("2026-06-25");
      expect(date).not.toBeNull();
      expect(toISODate(date!)).toBe("2026-06-25");
    });

    it("rejects invalid formats", () => {
      expect(parseISODate("")).toBeNull();
      expect(parseISODate("25.06.2026")).toBeNull();
      expect(parseISODate("abcd-01-01")).toBeNull();
    });
  });

  describe("isSameDay", () => {
    it("compares calendar days, not timestamps", () => {
      const a = new Date(2026, 5, 25, 8, 0, 0);
      const b = new Date(2026, 5, 25, 22, 30, 0);
      expect(isSameDay(a, b)).toBe(true);
      expect(isSameDay(a, new Date(2026, 5, 26))).toBe(false);
    });
  });

  describe("buildMonthGrid", () => {
    it("always returns 42 cells for a 6-row Monday-first grid", () => {
      const cells = buildMonthGrid(new Date(2026, 0, 15));
      expect(cells).toHaveLength(42);
    });

    it("marks exactly one month worth of inMonth cells for January 2026", () => {
      const cells = buildMonthGrid(new Date(2026, 0, 15));
      expect(cells.filter((c) => c.inMonth).length).toBe(31);
      expect(cells.some((c) => c.inMonth && c.day === 1)).toBe(true);
      expect(cells.some((c) => c.inMonth && c.day === 31)).toBe(true);
    });

    it("uses ISO strings for each cell", () => {
      const cells = buildMonthGrid(new Date(2026, 5, 1));
      for (const cell of cells) {
        expect(cell.iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe("addMonths", () => {
    it("moves to the first day of the target month", () => {
      const next = addMonths(new Date(2026, 0, 25), 2);
      expect(next.getFullYear()).toBe(2026);
      expect(next.getMonth()).toBe(2);
      expect(next.getDate()).toBe(1);
    });
  });

  describe("formatDisplayDate", () => {
    it("formats valid ISO as ru-RU dd.mm.yyyy", () => {
      expect(formatDisplayDate("2026-06-25")).toMatch(/^25\.06\.2026$/);
    });

    it("returns empty string for invalid input", () => {
      expect(formatDisplayDate("bad")).toBe("");
    });
  });
});
