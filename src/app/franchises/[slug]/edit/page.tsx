import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { franchiseInclude } from "@/lib/franchise-include";
import { FranchiseForm } from "@/components/FranchiseForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    select: { name: true },
  });
  return { title: franchise ? `Редактировать: ${franchise.name}` : "Редактирование" };
}

export default async function FranchiseEditPage({ params }: PageProps) {
  const { slug } = await params;

  const franchise = await prisma.franchise.findUnique({
    where: { slug },
    include: franchiseInclude,
  });

  if (!franchise) notFound();

  return (
    <div className="space-y-8">
      <Link
        href={`/franchises/${franchise.slug}`}
        className="focus-ring inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Назад к франшизе
      </Link>

      <header>
        <p className="font-mono-tech text-accent">редактирование</p>
        <h1 className="font-display mt-1 text-3xl font-bold sm:text-4xl">
          {franchise.name}
        </h1>
      </header>

      <FranchiseForm mode="edit" franchise={franchise} />
    </div>
  );
}
