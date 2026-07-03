import { describe, expect, it } from "vitest";
import {
  defaultDurationFormat,
  formatDurationField,
  parseDuration,
} from "@/lib/shared/duration";

describe("parseDuration", () => {
  it("returns null seconds and no error for empty input", () => {
    expect(parseDuration("hms", "")).toEqual({ seconds: null, error: null });
  });

  it("parses hms two-part as mm:ss", () => {
    expect(parseDuration("hms", "2:30")).toEqual({ seconds: 150, error: null });
  });

  it("parses hms three-part", () => {
    expect(parseDuration("hms", "1:02:03")).toEqual({
      seconds: 3723,
      error: null,
    });
  });

  it("rejects minutes or seconds >= 60 in hms", () => {
    expect(parseDuration("hms", "0:60:00").error).toMatch(/60/);
    expect(parseDuration("hms", "0:00:60").error).toMatch(/60/);
  });

  it("parses minutes and seconds integer formats", () => {
    expect(parseDuration("minutes", "120")).toEqual({
      seconds: 7200,
      error: null,
    });
    expect(parseDuration("seconds", "7200")).toEqual({
      seconds: 7200,
      error: null,
    });
  });

  it("rejects negative and non-numeric minutes", () => {
    expect(parseDuration("minutes", "-5").error).toBeTruthy();
    expect(parseDuration("minutes", "abc").error).toBeTruthy();
  });

  it("rejects malformed hms shapes", () => {
    expect(parseDuration("hms", "1").error).toBeTruthy();
    expect(parseDuration("hms", "1:2:3:4").error).toBeTruthy();
    expect(parseDuration("hms", "1::2").error).toBeTruthy();
  });
});

describe("formatDurationField", () => {
  it("formats seconds back into each representation", () => {
    expect(formatDurationField("seconds", 7200)).toBe("7200");
    expect(formatDurationField("minutes", 7200)).toBe("120");
    expect(formatDurationField("hms", 3723)).toBe("1:02:03");
  });

  it("returns empty string for null or non-positive values", () => {
    expect(formatDurationField("hms", null)).toBe("");
    expect(formatDurationField("hms", 0)).toBe("");
  });
});

describe("defaultDurationFormat", () => {
  it("always returns hms", () => {
    expect(defaultDurationFormat()).toBe("hms");
  });
});
