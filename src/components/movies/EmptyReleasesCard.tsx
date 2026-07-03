import Link from "next/link";

interface EmptyReleasesCardProps {
  movieSlug: string;
}

export function EmptyReleasesCard({ movieSlug }: EmptyReleasesCardProps) {
  return (
    <section className="surface-card p-5">
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
