import { notFound } from "next/navigation";
import { EntityEditLayout } from "@/components/layout/EntityEditLayout";
import { FranchiseForm } from "@/components/franchises/FranchiseForm";
import {
  generateFranchiseMetadata,
  loadFranchiseBySlug,
} from "@/lib/franchises/load-franchise-by-slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return generateFranchiseMetadata(slug, "Редактировать");
}

export default async function FranchiseEditPage({ params }: PageProps) {
  const { slug } = await params;
  const franchise = await loadFranchiseBySlug(slug);
  if (!franchise) notFound();

  return (
    <EntityEditLayout
      backHref={`/franchises/${franchise.slug}`}
      backLabel="Назад к франшизе"
      eyebrow="редактирование"
      title={franchise.name}
      titleClassName="font-display text-3xl font-bold sm:text-4xl"
      fillViewport
    >
      <FranchiseForm mode="edit" franchise={franchise} />
    </EntityEditLayout>
  );
}
