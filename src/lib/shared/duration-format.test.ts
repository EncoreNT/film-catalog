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
    expect(formatDurationDelta(623)).toBe("10 мин 23 с");
  });
});

describe("formatBuildEtaSeconds", () => {
  it("formats queue ETA", () => {
    expect(formatBuildEtaSeconds(30)).toBe("меньше минуты");
    expect(formatBuildEtaSeconds(120)).toBe("~2 мин");
  });
});


describe("ETA with ten-second precision", () => {
  it.each([
    [1, "~10 с"], [14, "~10 с"], [15, "~20 с"], [54, "~50 с"],
    [59, "~1 мин"], [194, "~3 мин 10 с"], [195, "~3 мин 20 с"],
    [3599, "~1 ч"], [3611, "~1 ч 10 с"], [3679, "~1 ч 1 мин 20 с"],
  ])("rounds %s seconds without fractional minutes", (seconds, label) => {
    expect(formatBuildEtaSeconds(seconds as number, "ten-seconds")).toBe(label);
  });
});
