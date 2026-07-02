import { describe, expect, it } from "vitest";
import {
  formatMergeCandidateFacts,
  formatMergeCandidateSelectLabel,
} from "./merge-candidate-label";
import type { MergeCandidate } from "./merge-preview-types";

function candidate(
  patch: Partial<MergeCandidate> & Pick<MergeCandidate, "id">,
): MergeCandidate {
  return {
    slug: `movie-${patch.id}`,
    title: "Master i Margarita",
    year: null,
    status: "DRAFT",
    rating: null,
    watchedAt: null,
    coverUrl: null,
    description: null,
    genres: [],
    franchiseNames: [],
    releases: [],
    ...patch,
  };
}

describe("formatMergeCandidateFacts", () => {
  it("describes a single release without title", () => {
    expect(
      formatMergeCandidateFacts(
        candidate({
          id: 42,
          status: "DRAFT",
          releases: [
            {
              id: 1,
              label: "HDTVRip",
              filePath: "/mnt/d/Series/Master.E01.mkv",
              storageName: null,
              fileSizeLabel: "1.4 ГБ",
            },
          ],
        }),
      ),
    ).toBe("черновик · HDTVRip · локальный · 1.4 ГБ · Master.E01.mkv");
  });
});

describe("formatMergeCandidateSelectLabel", () => {
  it("prefixes facts with card id", () => {
    expect(
      formatMergeCandidateSelectLabel(
        candidate({
          id: 42,
          status: "DRAFT",
          releases: [
            {
              id: 1,
              label: "HDTVRip",
              filePath: "/mnt/d/Series/Master.E01.mkv",
              storageName: null,
              fileSizeLabel: "1.4 ГБ",
            },
          ],
        }),
      ),
    ).toBe(
      "#42 · черновик · HDTVRip · локальный · 1.4 ГБ · Master.E01.mkv",
    );
  });

  it("shows external storage name and rating", () => {
    expect(
      formatMergeCandidateSelectLabel(
        candidate({
          id: 7,
          status: "CATALOG",
          rating: 8,
          releases: [
            {
              id: 2,
              label: "BDRemux · 4K",
              filePath: "F:\\Films\\movie.mkv",
              storageName: "WD 2TB",
              fileSizeLabel: "68.6 ГБ",
            },
          ],
        }),
      ),
    ).toContain("#7 · каталог · ★ 8.0 · BDRemux · 4K · WD 2TB · 68.6 ГБ · movie.mkv");
  });

  it("summarizes multiple releases", () => {
    const label = formatMergeCandidateSelectLabel(
      candidate({
        id: 99,
        releases: [
          {
            id: 1,
            label: "4K",
            filePath: "/a/4k.mkv",
            storageName: null,
            fileSizeLabel: "50 ГБ",
          },
          {
            id: 2,
            label: "1080p",
            filePath: "/b/1080.mkv",
            storageName: "WD 2TB",
            fileSizeLabel: "16 ГБ",
          },
        ],
      }),
    );
    expect(label).toContain("#99");
    expect(label).toContain("2 рел. · 4K + 1080p");
    expect(label).toContain("2 диска");
  });
});
