import { describe, expect, it } from "vitest";
import {
  assertWatchDateAllowed,
  calendarISOFromDateTime,
  formatWatchCount,
  maxAllowedWatchISODate,
  sortWatchesByDate,
  watchInstantFromISODate,
  watchISODateFromInstant,
} from "@/lib/movies/movie-watch-date";

describe("watch calendar dates", () => {
  it("stores a calendar day as UTC midnight", () => {
    const instant = watchInstantFromISODate("2026-09-28");
    expect(instant.toISOString()).toBe("2026-09-28T00:00:00.000Z");
    expect(watchISODateFromInstant(instant)).toBe("2026-09-28");
  });

  it("rejects impossible calendar days", () => {
    expect(() => watchInstantFromISODate("2026-02-31")).toThrow(
      "Некорректная дата просмотра",
    );
    expect(() => watchInstantFromISODate("28.09.2026")).toThrow(
      "Некорректная дата просмотра",
    );
  });

  it("reads the UTC day from an ISO datetime", () => {
    expect(calendarISOFromDateTime("2024-06-01T12:00:00.000Z")).toBe(
      "2024-06-01",
    );
  });

  it("allows the client local today when it is still yesterday in UTC", () => {
    const now = new Date("2026-09-28T21:30:00.000Z");
    expect(maxAllowedWatchISODate(now)).toBe("2026-09-29");
    expect(assertWatchDateAllowed("2026-09-29", now).toISOString()).toBe(
      "2026-09-29T00:00:00.000Z",
    );
  });

  it("rejects a date after tomorrow UTC", () => {
    const now = new Date("2026-09-28T12:00:00.000Z");
    expect(() => assertWatchDateAllowed("2026-09-30", now)).toThrow(
      "Дата просмотра не может быть в будущем",
    );
  });
});

describe("sortWatchesByDate", () => {
  it("orders viewing days from newest to oldest", () => {
    expect(
      sortWatchesByDate([
        { id: 1, watchedOn: "2024-01-01" },
        { id: 2, watchedOn: "2026-09-28" },
        { id: 3, watchedOn: "2025-05-01" },
      ]).map((row) => row.id),
    ).toEqual([2, 3, 1]);
  });
});

describe("formatWatchCount", () => {
  it("pluralizes russian view counts", () => {
    expect(formatWatchCount(1)).toBe("1 просмотр");
    expect(formatWatchCount(2)).toBe("2 просмотра");
    expect(formatWatchCount(5)).toBe("5 просмотров");
    expect(formatWatchCount(11)).toBe("11 просмотров");
    expect(formatWatchCount(21)).toBe("21 просмотр");
    expect(formatWatchCount(22)).toBe("22 просмотра");
  });
});
