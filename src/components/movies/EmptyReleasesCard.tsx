import Link from "next/link";
import { SpotlightTier } from "@/components/layout/SpotlightTier";

interface EmptyReleasesCardProps {
  movieSlug: string;
}

export function EmptyReleasesCard({ movieSlug }: EmptyReleasesCardProps) {
  return (
    <section className="surface-card p-5">
      {/* No releases → no quality tier, so the page reads as the neutral
          "standard" (cool white) spotlight rather than the general idle glow. */}
      <SpotlightTier tier="standard" />
      <p className="text-sm text-muted">У фильма пока нет релизов.</p>
      <Link
        href={`/movies/${movieSlug}/releases/new`}
        className="focus-ring mt-3 inline-flex items-center gap-2 text-sm text-accent hover:underline"
      >
        Добавить релиз
      </Link>
    </section>
  );
}
