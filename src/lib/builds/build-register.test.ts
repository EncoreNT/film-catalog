import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { registerBuildOutput } from "@/lib/builds/build-register";
import { movieFileDownloadedAtSortKey } from "@/lib/movies/movie-release-sort";

vi.mock("@/lib/media/ffprobe", () => ({
  probeMediaFile: vi.fn(async () => ({
    durationSeconds: 120,
    video: null,
    audio: [],
    subtitles: [],
  })),
}));

vi.mock("@/lib/releases/load-movie-file-meta", () => ({
  loadMovieFileMeta: async () => ({
    readMovieFileMeta: async () => ({
      fileSize: 1000,
      fileHash: "built-file-hash",
      fileMtime: new Date("2026-11-08T12:00:00Z"),
      fileDownloadedAt: new Date("2026-11-08T12:00:00Z"),
    }),
  }),
}));

const sourceDate = new Date("2023-06-01T10:00:00Z");
const outputDate = new Date("2026-11-08T12:00:00Z");
const movieIds: number[] = [];

afterEach(async () => {
  await prisma.releaseBuild.deleteMany({ where: { movieId: { in: movieIds } } });
  await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
  movieIds.length = 0;
});

async function fixture(downloadedAt: Date | null = sourceDate, bdmv = false) {
  const key = `build-register-${randomUUID()}`;
  const movie = await prisma.movie.create({
    data: {
      title: "Build registration test",
      slug: key,
      matchKey: key,
      releases: {
        create: [
          { fileDownloadedAt: downloadedAt },
          { fileDownloadedAt: new Date("2024-01-01T00:00:00Z") },
        ],
      },
      parts: { create: { partNumber: 1 } },
    },
    include: { releases: { orderBy: { id: "asc" } }, parts: true },
  });
  movieIds.push(movie.id);
  const build = await prisma.releaseBuild.create({
    data: {
      movieId: movie.id,
      moviePartId: movie.parts[0].id,
      kind: bdmv ? "bdmv" : "recipe",
      outputPath: `/tmp/${key}.mkv`,
      sources: {
        create: bdmv
          ? [{ role: "bdmv-playlist", filePath: "/tmp/source.mpls" }]
          : [
              { role: "tracks", releaseId: movie.releases[1].id, filePath: "/tmp/audio.mkv" },
              { role: "video", releaseId: movie.releases[0].id, filePath: "/tmp/video.mkv" },
            ],
      },
    },
  });
  return { movie, build };
}

describe("registerBuildOutput", () => {
  it.each([sourceDate, null])("inherits the video source date (%s), including an unknown date", async (date) => {
    const { movie, build } = await fixture(date);
    const before = movieFileDownloadedAtSortKey(movie.releases);
    const outputId = await registerBuildOutput(build.id, build.outputPath);
    const output = await prisma.release.findUniqueOrThrow({ where: { id: outputId } });

    expect(output.fileDownloadedAt).toEqual(date);
    expect(output.moviePartId).toBe(build.moviePartId);
    expect(output.fileMtime).toEqual(outputDate);
    expect(output.fileHash).toBe("built-file-hash");
    expect(output.fileSize).toBe(1000);
    expect(movieFileDownloadedAtSortKey([...movie.releases, output])).toBe(before);
    expect(await registerBuildOutput(build.id, build.outputPath)).toBe(outputId);
    expect(await prisma.release.count({ where: { movieId: movie.id } })).toBe(3);
  });

  it("keeps the output file date for a BDMV build without a source release", async () => {
    const { build } = await fixture(sourceDate, true);
    const id = await registerBuildOutput(build.id, build.outputPath);
    const output = await prisma.release.findUniqueOrThrow({ where: { id } });
    expect(output.fileDownloadedAt).toEqual(outputDate);
    expect(output.moviePartId).toBe(build.moviePartId);
  });

  it("keeps the output file date if the video source release was deleted", async () => {
    const { movie, build } = await fixture();
    await prisma.release.delete({ where: { id: movie.releases[0].id } });
    const id = await registerBuildOutput(build.id, build.outputPath);
    const output = await prisma.release.findUniqueOrThrow({ where: { id } });
    expect(output.fileDownloadedAt).toEqual(outputDate);
  });
});
