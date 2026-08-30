import { describe, expect, it } from "vitest";
import { mkdtemp, writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db/prisma";
import { deleteRelease } from "@/lib/releases/delete-release";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe("deleteRelease", () => {
  it("deletes release row without touching file by default", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fc-delete-"));
    const filePath = path.join(dir, "sample.mkv");
    await writeFile(filePath, "payload");

    const movie = await prisma.movie.create({
      data: {
        slug: `delete-test-${Date.now()}`,
        title: "Delete Test",
        matchKey: `delete-test-${Date.now()}`,
        releases: {
          create: [
            { filePath: path.join(dir, "a.mkv") },
            { filePath },
          ],
        },
      },
      include: { releases: true },
    });

    const releaseId = movie.releases.find((r) => r.filePath === filePath)!.id;
    const result = await deleteRelease(movie.id, releaseId);

    expect(result.fileDeleted).toBe(false);
    expect(result.movieDeleted).toBe(false);
    expect(await fileExists(filePath)).toBe(true);
    expect(
      await prisma.release.findUnique({ where: { id: releaseId } }),
    ).toBeNull();

    await prisma.movie.delete({ where: { id: movie.id } });
  });

  it("deletes file when deleteFile is true", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fc-delete-file-"));
    const filePath = path.join(dir, "gone.mkv");
    await writeFile(filePath, "payload");

    const movie = await prisma.movie.create({
      data: {
        slug: `delete-file-${Date.now()}`,
        title: "Delete File Test",
        matchKey: `delete-file-${Date.now()}`,
        releases: {
          create: [
            { filePath: path.join(dir, "keep.mkv") },
            { filePath },
          ],
        },
      },
      include: { releases: true },
    });

    const releaseId = movie.releases.find((r) => r.filePath === filePath)!.id;
    const result = await deleteRelease(movie.id, releaseId, { deleteFile: true });

    expect(result.fileDeleted).toBe(true);
    expect(result.movieDeleted).toBe(false);
    expect(await fileExists(filePath)).toBe(false);

    await prisma.movie.delete({ where: { id: movie.id } });
  });

  it("deletes release when cancelled move job exists", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fc-delete-move-"));
    const filePath = path.join(dir, "moved.mkv");
    await writeFile(filePath, "payload");

    const movie = await prisma.movie.create({
      data: {
        slug: `delete-move-${Date.now()}`,
        title: "Delete With Move History",
        matchKey: `delete-move-${Date.now()}`,
        releases: {
          create: [
            { filePath: path.join(dir, "other.mkv") },
            { filePath },
          ],
        },
      },
      include: { releases: true },
    });

    const releaseId = movie.releases.find((r) => r.filePath === filePath)!.id;
    await prisma.releaseMove.create({
      data: {
        movieId: movie.id,
        releaseId,
        status: "CANCELLED",
        sourceFilePath: filePath,
        targetPath: path.join(dir, "dest"),
        targetFilename: "dest.mkv",
      },
    });

    const result = await deleteRelease(movie.id, releaseId);
    expect(result.movieDeleted).toBe(false);
    expect(
      await prisma.release.findUnique({ where: { id: releaseId } }),
    ).toBeNull();
    expect(await prisma.releaseMove.count({ where: { releaseId } })).toBe(0);

    await prisma.movie.delete({ where: { id: movie.id } });
  });

  it("keeps the movie when removing the only release", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "fc-delete-last-"));
    const filePath = path.join(dir, "only.mkv");
    await writeFile(filePath, "payload");

    const movie = await prisma.movie.create({
      data: {
        slug: `delete-last-${Date.now()}`,
        title: "Delete Last Release",
        matchKey: `delete-last-${Date.now()}`,
        releases: {
          create: [{ filePath }],
        },
      },
      include: { releases: true },
    });

    const releaseId = movie.releases[0]!.id;
    const result = await deleteRelease(movie.id, releaseId);

    expect(result.movieDeleted).toBe(false);
    expect(await prisma.movie.findUnique({ where: { id: movie.id } })).not.toBeNull();
    expect(await prisma.release.findUnique({ where: { id: releaseId } })).toBeNull();
    const movieRow = await prisma.movie.findUnique({
      where: { id: movie.id },
      select: { primaryReleaseId: true },
    });
    expect(movieRow?.primaryReleaseId).toBeNull();
    expect(await fileExists(filePath)).toBe(true);

    await prisma.movie.delete({ where: { id: movie.id } });
  });
});
