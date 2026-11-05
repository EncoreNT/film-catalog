"use client";

import { ApiCoverImage } from "@/components/primitives/ApiCoverImage";

interface MovieCoverHeroProps {
  coverUrl: string | null;
  title: string;
}

// Sample the loaded local poster once; gradients can then tint the whole screen
// without blurring a second full-resolution image behind the scrolling content.
function setPosterLight(image: HTMLImageElement) {
  const scene = image.closest<HTMLElement>(".movie-detail-page");
  if (!scene) return;
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 3;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, 1, 3);
  const pixels = context.getImageData(0, 0, 1, 3).data;
  scene.style.setProperty("--poster-top", pixels.slice(0, 3).join(" "));
  scene.style.setProperty("--poster-base", pixels.slice(8, 11).join(" "));
}

export function MovieCoverHero({ coverUrl, title }: MovieCoverHeroProps) {
  return (
    <div className="movie-poster">
      <div className="movie-poster-glint" aria-hidden />
      <div className="movie-poster-art relative aspect-[2/3] overflow-hidden bg-bg-elevated">
        {coverUrl ? (
          <ApiCoverImage
            src={coverUrl}
            onLoad={(event) => setPosterLight(event.currentTarget)}
            alt={`Обложка: ${title}`}
            fill
            sizes="(min-width: 1800px) 560px, (min-width: 721px) 31vw, 72vw"
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
