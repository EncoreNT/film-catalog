import { notFound } from "next/navigation";
import { franchiseCoverUrlFromFranchise } from "@/lib/covers/franchise-cover-url";
import { computeFranchiseSummary } from "@/lib/franchises/franchise-summary";
import { FranchiseDetailHero } from "@/components/franchises/FranchiseDetailHero";
import { FranchiseSlotsView } from "@/components/franchises/FranchiseSlotsView";
import { SpotlightTier } from "@/components/layout/SpotlightTier";
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

/**
 * Desktop: pinned masthead (hero) + pinned slots header + scrolling grid.
 * Only the movie list scrolls; the "Фильмы франшизы" sort row stays put.
 * Cover height is budgeted in the hero so a full poster-card row fits below.
 * Mobile: normal document flow.
 *
 * Card glows + cover alignment: handled inside FranchiseSlotsView — its grid
 * wrapper extends into main's horizontal padding (-mx) and pads content back
 * (px) so the grid aligns with the hero cover and gold/ruby box-shadows paint
 * into the gutter instead of being clipped by the scrollport's overflow-y.
 */
export default async function FranchisePage({ params }: PageProps) {
  const { slug } = await params;
  const franchise = await loadFranchiseBySlug(slug);
  if (!franchise) notFound();

  const summary = computeFranchiseSummary(franchise);
  const coverUrl = franchiseCoverUrlFromFranchise(franchise);

  // Spotlight = best tier among the franchise's filled slots (ruby > gold >
  // standard), so a franchise page reads like its strongest film.
  const spotlightTier = summary.slots.some((s) => s.tier === "ruby")
    ? "ruby"
    : summary.slots.some((s) => s.tier === "gold")
      ? "gold"
      : "standard";

  return (
    <div className="flex flex-col gap-5 lg:-mb-10 lg:h-[calc(100dvh-6.25rem)] lg:gap-4">
      <SpotlightTier tier={spotlightTier} />

      <div className="shrink-0">
        <FranchiseDetailHero
          franchise={franchise}
          coverUrl={coverUrl}
          summary={summary}
        />
      </div>

      {/* Slots view owns its pinned header + scrolling grid (only the list
          scrolls; the sort row stays put). It fills the remaining height. */}
      <FranchiseSlotsView
        franchiseId={franchise.id}
        slots={franchise.slots}
      />
    </div>
  );
}
