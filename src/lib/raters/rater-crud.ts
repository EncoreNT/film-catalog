import { prisma } from "@/lib/db/prisma";

export async function listRaters() {
  return prisma.rater.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export async function createRater(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Имя оценщика не может быть пустым");
  }

  const maxOrder = await prisma.rater.aggregate({ _max: { sortOrder: true } });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  return prisma.rater.create({
    data: { name: trimmed, sortOrder },
  });
}

export async function updateRater(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Имя оценщика не может быть пустым");
  }

  return prisma.rater.update({
    where: { id },
    data: { name: trimmed },
  });
}

export async function deleteRater(id: number) {
  const count = await prisma.rater.count();
  if (count <= 1) {
    throw new Error("Нельзя удалить последнего оценщика");
  }

  return prisma.rater.delete({ where: { id } });
}

export async function reorderRaters(ids: number[]) {
  if (ids.length === 0) return listRaters();

  const existing = await prisma.rater.findMany({ select: { id: true } });
  const existingIds = new Set(existing.map((r) => r.id));
  if (ids.length !== existing.length || ids.some((id) => !existingIds.has(id))) {
    throw new Error("Некорректный порядок оценщиков");
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.rater.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return listRaters();
}
