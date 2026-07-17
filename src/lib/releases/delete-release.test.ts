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
    expect(await fileExists(filePath)).toBe(false);

    await prisma.movie.delete({ where: { id: movie.id } });
  });
});
