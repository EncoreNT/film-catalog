import { describe, expect, it } from "vitest";
import { buildWatchCalendar, groupWatchCalendarMonths, parseWatchCalendarQuery, parseWatchCalendarLayout, shiftWatchCalendar, watchCalendarLabel, watchCalendarToday, watchCalendarHref } from "./watch-calendar";

describe("watch calendar", () => {
  it("preserves timeline layout alongside both period modes and defaults invalid layouts to the calendar", () => {
    expect(parseWatchCalendarLayout("timeline")).toBe("timeline");
    for (const value of [undefined, "bad", ["timeline", "calendar"]]) expect(parseWatchCalendarLayout(value)).toBe("calendar");
    expect(watchCalendarHref("2026-11-09", "year", "recent", "Europe/Moscow", "timeline"))
      .toBe("/calendar?mode=recent&view=year&timeZone=Europe%2FMoscow&layout=timeline");
    expect(watchCalendarHref("2026-10-01", "month", "calendar", undefined, "timeline"))
      .toBe("/calendar?date=2026-10-01&view=month&layout=timeline");
    expect(watchCalendarHref("2026-10-01", "month", "calendar")).toBe("/calendar?date=2026-10-01&view=month");
  });
  it("defaults to the latest twelve months while honoring explicit calendar mode", () => {
    const today = "2026-11-09";
    expect(parseWatchCalendarQuery({}, today)).toEqual({ date: today, view: "year", mode: "recent" });
    expect(parseWatchCalendarQuery({ timeZone: "Europe/Moscow" }, today)).toEqual({ date: today, view: "year", mode: "recent" });
    expect(parseWatchCalendarQuery({ mode: "calendar" }, today)).toEqual({ date: today, view: "year", mode: "calendar" });
    expect(parseWatchCalendarQuery({ mode: "recent", view: "month" }, today)).toEqual({ date: today, view: "month", mode: "recent" });
  });
  it.each([["2024-02-29", 366], ["2026-11-09", 365]] as const)("includes every day of calendar year %s", (date, count) => {
    const year = date.slice(0, 4);
    const range = buildWatchCalendar(date, "year");
    expect(range.start).toBe(`${year}-01-01`);
    expect(range.endExclusive).toBe(`${Number(year) + 1}-01-01`);
    expect(range.days).toHaveLength(count);
    expect(range.days.at(-1)?.iso).toBe(`${year}-12-31`);
    const months = groupWatchCalendarMonths(range.days);
    expect(months).toHaveLength(12);
    expect(months.flatMap((month) => month.days.filter(Boolean))).toEqual(range.days);
    for (const month of months) {
      month.days.forEach((day, index) => {
        if (day) expect(index % 7).toBe((new Date(`${day.iso}T12:00:00Z`).getUTCDay() + 6) % 7);
      });
    }
    expect(watchCalendarLabel(date, "year")).toBe(year);
  });
  it.each([
    ["2026-11-09", "2025-12-01", "2026-11-10"],
    ["2024-03-01", "2023-04-01", "2024-03-02"],
    ["2025-01-01", "2024-02-01", "2025-01-02"],
    ["2024-02-29", "2023-03-01", "2024-03-01"],
    ["2026-12-31", "2026-01-01", "2027-01-01"],
  ])("includes the current month and eleven preceding months through today: %s", (today, start, end) => {
    const range = buildWatchCalendar(today, "year", "recent");
    expect(range.start).toBe(start);
    expect(range.endExclusive).toBe(end);
    expect(new Set(range.days.map((day) => day.iso)).size).toBe(range.days.length);
    expect(range.days.length).toBe((Date.parse(end) - Date.parse(start)) / 86_400_000);
    expect(range.days.at(-1)?.iso).toBe(today);
    const months = groupWatchCalendarMonths(range.days);
    expect(months).toHaveLength(12);
    expect(months.flatMap((month) => month.days.filter(Boolean))).toEqual(range.days);
    expect(range.days.every((day, index) => day.iso <= today && (index === 0 || day.iso > range.days[index - 1].iso))).toBe(true);
    expect(months[0].days.findIndex(Boolean) % 7).toBe((new Date(`${range.start}T12:00:00Z`).getUTCDay() + 6) % 7);
  });
  it("navigates whole years safely from leap day and preserves bookmarked year views", () => {
    expect(shiftWatchCalendar("2024-02-29", "year", 1)).toBe("2025-01-01");
    expect(shiftWatchCalendar("2024-02-29", "year", -1)).toBe("2023-01-01");
    expect(parseWatchCalendarQuery({ date: "2024-02-29", view: "year" }, "2026-11-09"))
      .toEqual({ date: "2024-02-29", view: "year", mode: "calendar" });
    expect(parseWatchCalendarQuery({ date: "2024-02-29", view: "year", mode: "recent" }, "2026-11-09").date).toBe("2026-11-09");
    expect(watchCalendarHref("2026-11-09", "year", "recent")).toBe("/calendar?mode=recent&view=year");
  });
  it.each([['month', 30, '2026-10-10'], ['fortnight', 14, '2026-10-26'], ['week', 7, '2026-11-02']] as const)("shows exactly the latest %s days ending today", (view, count, start) => {
    const range = buildWatchCalendar("2026-11-08", view, "recent");
    expect(range.days).toHaveLength(count);
    expect(range.start).toBe(start);
    expect(range.endExclusive).toBe("2026-11-09");
    expect(range.days[0].iso).toBe(start);
    expect(range.days.at(-1)?.iso).toBe("2026-11-08");
    expect(range.rows * range.columns).toBe(count);
    expect(range.days.every((day, index) => day.iso <= "2026-11-08" && (index === 0 || day.iso > range.days[index - 1].iso))).toBe(true);
  });
  it("keeps recent mode anchored to today despite stale or future date parameters", () => {
    for (const date of ["2025-01-01", "2099-01-01"]) {
      expect(parseWatchCalendarQuery({ date, mode: "recent", view: "week" }, "2026-11-08"))
        .toEqual({ date: "2026-11-08", view: "week", mode: "recent" });
    }
    expect(parseWatchCalendarQuery({ mode: "invalid" }, "2026-11-08").mode).toBe("recent");
    expect(watchCalendarHref("2026-11-08", "month", "recent", "Europe/Moscow"))
      .toBe("/calendar?mode=recent&view=month&timeZone=Europe%2FMoscow");
  });
  it("resolves today in the viewer timezone and safely ignores invalid timezone names", () => {
    const now = new Date("2026-11-08T23:30:00Z");
    expect(watchCalendarToday("Europe/Moscow", now)).toBe("2026-11-09");
    expect(watchCalendarToday("America/New_York", now)).toBe("2026-11-08");
    expect(watchCalendarToday("invalid", now)).toBe(watchCalendarToday(undefined, now));
  });
  it("recent spans cross leap days and years without padding", () => {
    const leap = buildWatchCalendar("2024-03-01", "week", "recent");
    expect(leap.start).toBe("2024-02-24");
    expect(leap.days.at(-2)?.iso).toBe("2024-02-29");
    expect(buildWatchCalendar("2027-01-02", "week", "recent").start).toBe("2026-12-27");
    expect(watchCalendarLabel("2027-01-02", "week", "recent")).toContain("2026");
    expect(watchCalendarLabel("2027-01-02", "week", "recent")).toContain("2027");
  });
  it("fits a Monday-first February in four rows", () => {
    const range = buildWatchCalendar("2021-02-15", "month");
    expect(range.rows).toBe(4);
    expect(range.start).toBe("2021-02-01");
    expect(range.endExclusive).toBe("2021-03-01");
  });
  it("includes adjacent months for a six-row month", () => {
    const range = buildWatchCalendar("2026-11-08", "month");
    expect(range.rows).toBe(6);
    expect(range.start).toBe("2026-10-26");
    expect(range.days.at(-1)?.iso).toBe("2026-12-06");
    expect(range.days.filter((day) => day.inMonth)).toHaveLength(30);
    expect(range.endExclusive).toBe("2026-12-07");
  });
  it("preserves leap day and consecutive days across DST", () => {
    expect(buildWatchCalendar("2024-02-29", "month").days.some((day) => day.iso === "2024-02-29")).toBe(true);
    const range = buildWatchCalendar("2026-03-29", "fortnight");
    expect(range.days).toHaveLength(14);
    expect(new Set(range.days.map((day) => day.iso)).size).toBe(14);
    expect(range.start).toBe("2026-03-23");
    expect(range.endExclusive).toBe("2026-04-06");
  });
  it("starts Sunday weeks on the preceding Monday and crosses years", () => {
    const range = buildWatchCalendar("2027-01-03", "week");
    expect(range.start).toBe("2026-12-28");
    expect(range.endExclusive).toBe("2027-01-04");
    expect(watchCalendarLabel("2027-01-03", "week")).toContain("2026");
    expect(watchCalendarLabel("2027-01-03", "week")).toContain("2027");
  });
  it("moves months without overflowing the 31st, and weeks by their full span", () => {
    expect(shiftWatchCalendar("2026-01-31", "month", 1)).toBe("2026-02-01");
    expect(shiftWatchCalendar("2026-01-31", "month", -1)).toBe("2025-12-01");
    expect(shiftWatchCalendar("2026-12-28", "week", 1)).toBe("2027-01-04");
    expect(shiftWatchCalendar("2026-03-02", "fortnight", -1)).toBe("2026-02-16");
  });
  it.each(["2026-02-30", "bad", "0099-01-01", "9999-12-31", ["2026-01-01", "2026-02-01"]])("recovers from invalid date %s", (date) => {
    expect(parseWatchCalendarQuery({ date, view: "bad" }, "2026-11-08")).toEqual({ date: "2026-11-08", view: "year", mode: "calendar" });
  });
  it("accepts valid bookmarked state", () => {
    expect(parseWatchCalendarQuery({ date: "2024-02-29", view: "week" }, "2026-11-08")).toEqual({ date: "2024-02-29", view: "week", mode: "calendar" });
  });
});
