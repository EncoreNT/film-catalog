import { describe, expect, it } from "vitest";
import type { MediaJobEtaInput } from "@/lib/media-jobs/job-eta";
import {
  estimateMediaJobRemainingSeconds,
  mediaJobRunningEtaLabel,
} from "@/lib/media-jobs/job-eta";

function job(partial: Partial<MediaJobEtaInput> = {}): MediaJobEtaInput {
  return {
    status: "RUNNING",
    phase: "copying",
    progressPercent: 50,
    progressSpeed: 50 * 1024 * 1024,
    sourceFileSize: 10 * 1024 * 1024 * 1024,
    startedAt: new Date("2026-08-17T18:00:00.000Z").toISOString(),
    ...partial,
  };
}

describe("estimateMediaJobRemainingSeconds", () => {
  it("returns null while queued", () => {
    expect(
      estimateMediaJobRemainingSeconds(job({ status: "QUEUED" }), Date.parse("2026-08-17T18:01:00Z")),
    ).toBeNull();
  });

  it("returns null until enough progress or speed is known", () => {
    expect(
      estimateMediaJobRemainingSeconds(
        job({
          progressPercent: 0,
          progressSpeed: null,
          startedAt: new Date("2026-08-17T18:00:00.000Z").toISOString(),
        }),
        Date.parse("2026-08-17T18:00:01Z"),
      ),
    ).toBeNull();
  });

  it("prefers recent copy speed over average since start", () => {
    const now = Date.parse("2026-08-17T18:05:00.000Z");
    expect(estimateMediaJobRemainingSeconds(job(), now)).toBe(102);
  });

  it("falls back to elapsed time when speed is unknown", () => {
    const now = Date.parse("2026-08-17T18:05:00.000Z");
    expect(estimateMediaJobRemainingSeconds(job({ progressSpeed: null }), now)).toBe(300);
  });

  it("estimates remaining bytes / speed", () => {
    expect(
      estimateMediaJobRemainingSeconds(
        job({
          startedAt: null,
          progressPercent: 25,
          progressSpeed: 100 * 1024 * 1024,
          sourceFileSize: 1024 * 1024 * 1024,
        }),
      ),
    ).toBe(8);
  });

  it("uses a short budget while updating the catalog after copy", () => {
    expect(
      estimateMediaJobRemainingSeconds(job({ phase: "updating", progressPercent: 99 })),
    ).toBe(8);
  });
});

describe("mediaJobRunningEtaLabel", () => {
  it("formats remaining time like the build queue", () => {
    const now = Date.parse("2026-08-17T18:05:00.000Z");
    expect(mediaJobRunningEtaLabel(job({ progressSpeed: null }), now)).toBe(
      "осталось ~5 мин",
    );
  });
});
