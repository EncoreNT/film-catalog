import { prisma } from "@/lib/db/prisma";
import type { StorageOption } from "@/lib/shared/storage-types";

/** All registered releases count, including ones outside the visible catalog. */
export async function listExternalStorages(): Promise<StorageOption[]> {
  return prisma.$transaction(async (tx) => {
    const storages = await tx.externalStorage.findMany({
      orderBy: { name: "asc" },
    });
    const totals = await tx.release.groupBy({
      by: ["externalStorageId"],
      orderBy: { externalStorageId: "asc" },
      where: { externalStorageId: { not: null } },
      _sum: { fileSize: true },
      _count: { _all: true, fileSize: true },
    });
    const byStorage = new Map(
      totals.map((total) => [total.externalStorageId, total]),
    );
    return storages.map((storage) => {
      const total = byStorage.get(storage.id);
      return {
        id: storage.id,
        name: storage.name,
        path: storage.path,
        capacityBytes: storage.capacityBytes,
        _count: { releases: total?._count._all ?? 0 },
        usage: {
          knownBytes: total?._sum.fileSize ?? 0,
          unknownSizeCount: total
            ? total._count._all - total._count.fileSize
            : 0,
        },
      };
    });
  });
}

export async function createExternalStorage(data: {
  name: string;
  path?: string | null;
  capacityBytes?: number | null;
}) {
  const storage = await prisma.externalStorage.create({ data });
  return {
    ...storage,
    _count: { releases: 0 },
    usage: { knownBytes: 0, unknownSizeCount: 0 },
  };
}

export async function updateStorageCapacity(
  id: number,
  capacityBytes: number | null,
) {
  return prisma.externalStorage.update({
    where: { id },
    data: { capacityBytes },
  });
}
