import { prisma } from "@/lib/db/prisma";
import { franchiseInclude } from "@/lib/franchises/franchise-include";
import { FranchisesListClient } from "./FranchisesListClient";

export const metadata = {
  title: "Франшизы",
};

export default async function FranchisesPage() {
  const franchises = await prisma.franchise.findMany({
    orderBy: { name: "asc" },
    include: franchiseInclude,
  });

  return <FranchisesListClient franchises={franchises} />;
}
