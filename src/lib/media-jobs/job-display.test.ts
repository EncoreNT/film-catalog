import { describe, expect, it } from "vitest";
import {
  buildMediaJobStatusMeta,
  isMediaJobTerminal,
  mediaJobSpeedLabel,
} from "@/lib/media-jobs/job-display";
import { mediaJobProgressMessage } from "@/lib/media-jobs/job-progress-message";

describe("buildMediaJobStatusMeta", () => {
  it("uses different running labels for export vs move", () => {
    expect(buildMediaJobStatusMeta("export").RUNNING.label).toBe("Копирование");
    expect(buildMediaJobStatusMeta("move").RUNNING.label).toBe("Перемещение");
  });
});

describe("isMediaJobTerminal", () => {
  it("treats succeeded/failed/cancelled as terminal", () => {
    expect(isMediaJobTerminal("SUCCEEDED")).toBe(true);
    expect(isMediaJobTerminal("RUNNING")).toBe(false);
  });
});

describe("mediaJobSpeedLabel", () => {
  it("formats MiB/s", () => {
    expect(mediaJobSpeedLabel(50 * 1024 * 1024)).toBe("50 МБ/с");
  });
});

describe("mediaJobProgressMessage", () => {
  it("formats copied / total", () => {
    expect(mediaJobProgressMessage(1024 ** 3, 2 * 1024 ** 3)).toMatch(/1\.00 ГБ \/ 2\.00 ГБ/);
  });
});
