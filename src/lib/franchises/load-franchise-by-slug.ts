import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import {
  franchiseInclude,
  type FranchiseWithSlots,
} from "@/lib/franchises/franchise-include";

export async function loadFranchiseBySlug(
  slug: string,
): Promise<FranchiseWithSlots | null> {
  return prisma.franchise.findUnique({
    where: { slug },
    include: franchiseInclude,
  });
}

export async function generateFranchiseMetadata(
  slug: string,
  titlePrefix?: string,
): Promise<Metadata> {
  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    select: { name: true },
  });

  if (!franchise) return {};

  return {
    title: titlePrefix
      ? `${titlePrefix}: ${franchise.name}`
      : franchise.name,
  };
}
