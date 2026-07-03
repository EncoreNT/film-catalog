import { franchiseCoverUrlFromFranchise } from "@/lib/covers/franchise-cover-url";
import { getFranchiseMetrics } from "@/lib/franchises/franchise-metrics";
import {
  countFilledSlots,
  countTotalSlots,
} from "@/lib/franchises/franchise-utils";
import { FranchiseDetailHero } from "@/components/franchises/FranchiseDetailHero";
import { FranchiseSlotsView } from "@/components/franchises/FranchiseSlotsView";
import {
  generateFranchiseMetadata,
  loadFranchiseBySlug,
} from "@/lib/franchises/load-franchise-by-slug";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  return generateFranchiseMetadata(slug);
}

export default async function FranchisePage({ params }: PageProps) {
  const { slug } = await params;
  const franchise = await loadFranchiseBySlug(slug);

  const metrics = await getFranchiseMetrics(franchise.id);

  const coverUrl = franchiseCoverUrlFromFranchise(franchise);
  const filled = countFilledSlots(franchise.slots);
  const total = countTotalSlots(franchise.slots);

  return (
    <div className="space-y-10">
      <FranchiseDetailHero
        franchise={franchise}
        coverUrl={coverUrl}
        filled={filled}
        total={total}
        metrics={metrics}
      />

      <FranchiseSlotsView
        franchiseId={franchise.id}
        slots={franchise.slots}
      />
    </div>
  );
}
