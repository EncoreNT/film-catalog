import { describe, expect, it } from "vitest";
import {
  formatBuildEtaSeconds,
  formatDuration,
  formatDurationDelta,
} from "@/lib/shared/duration-format";

describe("formatDuration", () => {
  it("formats display and hms modes", () => {
    expect(formatDuration(125, "display")).toBe("2:05");
    expect(formatDuration(125, "hms")).toBe("0:02:05");
    expect(formatDuration(7200, "long")).toBe("2 ч 0 мин");
  });
});

describe("formatDurationDelta", () => {
  it("formats short deltas", () => {
    expect(formatDurationDelta(45)).toBe("45 с");
    expect(formatDurationDelta(125)).toBe("2 мин 5 с");
  });
});

describe("formatBuildEtaSeconds", () => {
  it("formats queue ETA", () => {
    expect(formatBuildEtaSeconds(30)).toBe("меньше минуты");
    expect(formatBuildEtaSeconds(120)).toBe("~2 мин");
  });
});
