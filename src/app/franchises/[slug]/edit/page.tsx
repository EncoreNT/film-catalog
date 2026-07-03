import { BackLink } from "@/components/primitives/BackLink";
import { EditPageHeader } from "@/components/layout/EditPageHeader";
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

  return (
    <div className="space-y-8">
      <BackLink href={`/franchises/${franchise.slug}`}>
        Назад к франшизе
      </BackLink>

      <EditPageHeader
        eyebrow="редактирование"
        title={franchise.name}
        titleClassName="font-display mt-1 text-3xl font-bold sm:text-4xl"
      />

      <FranchiseForm mode="edit" franchise={franchise} />
    </div>
  );
}
