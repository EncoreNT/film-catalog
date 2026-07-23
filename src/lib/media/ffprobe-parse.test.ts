import { describe, expect, it } from "vitest";
import {
  bpsToKbps,
  parseDurationSeconds,
  parseTimecodeToSeconds,
} from "@/lib/media/ffprobe-parse";

describe("bpsToKbps", () => {
  it("converts bits per second to kbps", () => {
    expect(bpsToKbps("8000000")).toBe(8000);
    expect(bpsToKbps(null)).toBeNull();
  });
});

describe("parseDurationSeconds", () => {
  it("parses ffprobe format duration", () => {
    expect(parseDurationSeconds({ duration: "3723.040000" })).toBe(3723);
    expect(parseDurationSeconds(undefined)).toBeNull();
  });
});

describe("parseTimecodeToSeconds", () => {
  it("parses HH:MM:SS.mmm timecodes", () => {
    expect(parseTimecodeToSeconds("01:02:03.500")).toBe(3723.5);
  });
});
