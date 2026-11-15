"use client";

import type { ReactNode } from "react";
import { movieCoverUrl } from "@/lib/covers/cover-url";
import { ImageCoverUpload } from "./ImageCoverUpload";
import { KinoriumPosterPicker } from "@/components/movies/KinoriumPosterPicker";

interface CoverUploadProps {
  /** Existing movie id (edit mode). Omit in create mode to buffer the pick. */
  movieId?: number;
  hasCover?: boolean;
  coverVersion?: Date | string | number;
  onFileChange?: (file: File | null) => void;
  onUrlChange?: (url: string | null) => void;
  onUploaded?: () => void;
  label?: string;
  /** Kept for API symmetry; not rendered here. */
  hint?: ReactNode;
  /** Full-width cover for stacked movie edit sidebar. */
  layout?: "inline" | "stacked" | "poster";
  movieTitle?: string;
  originalTitle?: string;
  movieYear?: number | null;
}

export function CoverUpload({
  movieId,
  hasCover,
  coverVersion,
  onFileChange,
  onUrlChange,
  onUploaded,
  label = "Обложка",
  layout = "inline",
  movieTitle,
  originalTitle,
  movieYear,
}: CoverUploadProps) {
  const stacked = layout === "stacked";

  return (
    <ImageCoverUpload
      entityId={movieId}
      hasCover={hasCover}
      coverVersion={coverVersion}
      buildStoredUrl={movieCoverUrl}
      uploadPath={(id) => `/api/movies/${id}/cover`}
      aspectClass="aspect-[2/3]"
      thumbnailClassName={
        layout === "poster"
          ? "relative aspect-[2/3] w-full"
          : stacked
            ? "relative aspect-[2/3] w-full max-w-[12rem]"
            : "relative h-28 w-[5.25rem] shrink-0"
      }
      thumbnailSizes={
        layout === "poster"
          ? "(max-width: 767px) 240px, 25vw"
          : stacked
            ? "192px"
            : "84px"
      }
      dialogAspectClass="aspect-[2/3]"
      dialogMaxWidth="max-w-[12rem]"
      dialogSizes="192px"
      label={label}
      emptyLabel={layout === "poster" ? "Добавить постер" : undefined}
      showAction={layout === "poster"}
      urlInputId="cover-url"
      urlPlaceholder="https://…/poster.jpg"
      onFileChange={onFileChange}
      onUrlChange={onUrlChange}
      onUploaded={onUploaded}
      additionalSource={{
        label: "Kinorium",
        render: (context) => (
          <KinoriumPosterPicker
            title={movieTitle}
            originalTitle={originalTitle}
            year={movieYear}
            {...context}
          />
        ),
      }}
    />
  );
}
