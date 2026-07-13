import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";

interface MovieCoverHeroProps {
  coverUrl: string | null;
  title: string;
}

export function MovieCoverHero({ coverUrl, title }: MovieCoverHeroProps) {
  return (
    <div className="mx-auto w-full max-w-[300px] lg:mx-0 lg:max-w-none">
      {/* Soft projector glow sitting behind the framed poster */}
      <div className="relative">
        <div
          className="glow-hotspot pointer-events-none absolute -inset-5 -z-10 bg-accent/15"
          aria-hidden
        />
        <div className="poster-frame group">
          <div className="sheen-layer" aria-hidden />
          <div className="poster-frame-inner relative aspect-[2/3] overflow-hidden bg-bg-elevated">
            {coverUrl ? (
              <ApiCoverImage
                src={coverUrl}
                alt={`Обложка: ${title}`}
                fill
                sizes="(min-width: 1536px) 400px, (min-width: 1280px) 360px, (min-width: 1024px) 300px, 300px"
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
      </div>
    </div>
  );
}
