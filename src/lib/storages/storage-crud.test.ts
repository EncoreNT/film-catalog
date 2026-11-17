import { randomUUID } from "node:crypto";
import { afterEach, expect, it } from "vitest";
import { prisma } from "@/lib/db/prisma";
import {
  createExternalStorage,
  listExternalStorages,
  listStorageFiles,
  updateStorageCapacity,
} from "./storage-crud";

const movieIds: number[] = [];
const storageIds: number[] = [];
afterEach(async () => {
  await prisma.movie.deleteMany({ where: { id: { in: movieIds } } });
  await prisma.externalStorage.deleteMany({
    where: { id: { in: storageIds } },
  });
  movieIds.length = 0;
  storageIds.length = 0;
});

it("accounts for every disk's registered files, unknown sizes and changed assignments", async () => {
  const key = randomUUID();
  const first = await createExternalStorage({
    name: `storage-test-a-${key}`,
    capacityBytes: 2_000_000_000_000,
    path: "F:\\Коллекция",
  });
  storageIds.push(first.id);
  const second = await createExternalStorage({ name: `storage-test-b-${key}` });
  storageIds.push(second.id);
  expect(first.usage.knownBytes).toBe(0);
  for (const status of ["CATALOG", "DRAFT", "EXCLUDED"] as const) {
    const movie = await prisma.movie.create({
      data: {
        title: "Storage accounting fixture",
        slug: `${key}-${status}`,
        matchKey: `${key}-${status}`,
        status,
        releases: {
          create: [
            { externalStorageId: first.id, fileSize: 50_000_000_000, filePath: `/mnt/f/Коллекция/Фильмы/4K/${key}-${status}.mkv` },
            { externalStorageId: first.id, fileSize: null },
            { externalStorageId: null, fileSize: 999_000_000_000 },
          ],
        },
      },
    });
    movieIds.push(movie.id);
  }
  let storages = await listExternalStorages();
  const files = await listStorageFiles(first.id);
  expect(files).toHaveLength(6);
  expect(files?.find(file => file.fileSize !== null)?.folders).toEqual(["Фильмы", "4K"]);
  expect(files?.find(file => file.fileSize === null)?.folders).toBeNull();
  for (const status of ["CATALOG", "DRAFT", "EXCLUDED"]) {
    expect(files?.filter(file => file.slug === `${key}-${status}`).map(file => file.fileSize))
      .toEqual(expect.arrayContaining([50_000_000_000, null]));
  }
  expect(await listStorageFiles(second.id)).toEqual([]);
  expect(storages.find((s) => s.id === first.id)).toMatchObject({
    capacityBytes: 2_000_000_000_000,
    usage: { knownBytes: 150_000_000_000, unknownSizeCount: 3 },
    _count: { releases: 6 },
  });
  expect(storages.find((s) => s.id === second.id)).toMatchObject({
    capacityBytes: null,
    usage: { knownBytes: 0, unknownSizeCount: 0 },
  });
  await prisma.release.updateMany({
    where: {
      movieId: movieIds[0],
      externalStorageId: first.id,
      fileSize: { not: null },
    },
    data: { externalStorageId: second.id },
  });
  await updateStorageCapacity(first.id, null);
  expect(await listStorageFiles(second.id)).toMatchObject([
    { slug: `${key}-CATALOG`, fileSize: 50_000_000_000, folders: ["Коллекция", "Фильмы", "4K"] },
  ]);
  await updateStorageCapacity(second.id, 500_000_000_000);
  storages = await listExternalStorages();
  expect(storages.find((s) => s.id === first.id)).toMatchObject({
    capacityBytes: null,
    usage: { knownBytes: 100_000_000_000, unknownSizeCount: 3 },
  });
  expect(storages.find((s) => s.id === second.id)).toMatchObject({
    capacityBytes: 500_000_000_000,
    usage: { knownBytes: 50_000_000_000, unknownSizeCount: 0 },
  });
});
