import { describe, expect, it } from "vitest";
import {
  computeDurationMismatch,
  durationMismatchInlineLabel,
  durationMismatchSeverity,
  durationMismatchTooltipLines,
  formatDurationDelta,
  formatDurationPrecise,
} from "@/lib/builds/build-duration-hint";

describe("formatDurationDelta", () => {
  it("shows one decimal for sub-10 deltas", () => {
    expect(formatDurationDelta(2.5)).toBe("2.5 с");
    expect(formatDurationDelta(9)).toBe("9 с");
  });

  it("rounds larger sub-minute deltas", () => {
    expect(formatDurationDelta(45.2)).toBe("45 с");
  });

  it("formats minute-scale deltas", () => {
    expect(formatDurationDelta(90)).toBe("1 мин 30 с");
    expect(formatDurationDelta(120)).toBe("2 мин");
  });
});

describe("durationMismatchSeverity", () => {
  it("classifies small deltas as minor", () => {
    expect(durationMismatchSeverity(3)).toBe("minor");
  });

  it("classifies medium deltas as moderate", () => {
    expect(durationMismatchSeverity(30)).toBe("moderate");
  });

  it("classifies large deltas as critical", () => {
    expect(durationMismatchSeverity(120)).toBe("critical");
  });
});

describe("computeDurationMismatch", () => {
  it("returns null when durations are within threshold", () => {
    expect(computeDurationMismatch(7200, 7199.5)).toBeNull();
  });

  it("returns mismatch info when delta exceeds threshold", () => {
    const info = computeDurationMismatch(7200, 7187.5);
    expect(info).toMatchObject({
      deltaSeconds: 12.5,
      audioShorter: true,
      severity: "moderate",
    });
  });
});

describe("durationMismatchInlineLabel", () => {
  it("includes direction, delta and severity", () => {
    const info = computeDurationMismatch(7200, 7193.5)!;
    expect(durationMismatchInlineLabel(info)).toBe(
      "короче на 6.5 с · заметный",
    );
  });
});

describe("formatDurationPrecise", () => {
  it("includes seconds in hms format", () => {
    expect(formatDurationPrecise(9780)).toBe("2:43:00");
    expect(formatDurationPrecise(9774)).toBe("2:42:54");
  });
});

describe("durationMismatchTooltipLines", () => {
  it("shows precise durations with visible second difference", () => {
    const info = computeDurationMismatch(9780, 9774)!;
    expect(durationMismatchTooltipLines(info)).toEqual({
      headline: "Аудио короче видео на 6 с",
      detail: "Видео 2:43:00 · аудио 2:42:54",
    });
  });
});
