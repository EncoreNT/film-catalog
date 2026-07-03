import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";

interface MovieCoverHeroProps {
  coverUrl: string | null;
  title: string;
}

export function MovieCoverHero({ coverUrl, title }: MovieCoverHeroProps) {
  return (
    <div className="mx-auto w-full max-w-[280px]">
      <div className="surface-card relative aspect-[2/3] overflow-hidden">
        {coverUrl ? (
          <ApiCoverImage
            src={coverUrl}
            alt={`Обложка: ${title}`}
            fill
            sizes="280px"
            className="object-cover"
            loading="eager"
            fetchPriority="high"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <p className="font-display text-xl font-bold">{title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
