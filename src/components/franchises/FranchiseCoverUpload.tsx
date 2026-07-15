"use client";

import { franchiseCoverUrl } from "@/lib/covers/franchise-cover-url";
import { ImageCoverUpload } from "@/components/primitives/ImageCoverUpload";

interface FranchiseCoverUploadProps {
  franchiseId?: number;
  hasCover?: boolean;
  coverVersion?: Date | string | number;
  onFileChange?: (file: File | null) => void;
  onUrlChange?: (url: string | null) => void;
  onUploaded?: () => void;
  /** Full-width cover for stacked franchise edit sidebar. */
  layout?: "inline" | "stacked";
}

export function FranchiseCoverUpload({
  franchiseId,
  hasCover,
  coverVersion,
  onFileChange,
  onUrlChange,
  onUploaded,
  layout = "inline",
}: FranchiseCoverUploadProps) {
  const stacked = layout === "stacked";

  return (
    <ImageCoverUpload
      entityId={franchiseId}
      hasCover={hasCover}
      coverVersion={coverVersion}
      buildStoredUrl={franchiseCoverUrl}
      uploadPath={(id) => `/api/franchises/${id}/cover`}
      aspectClass="aspect-[16/9]"
      thumbnailClassName={
        stacked ? "relative aspect-[16/9] w-full" : "relative w-40 aspect-[16/9]"
      }
      thumbnailSizes={stacked ? "100vw" : "160px"}
      dialogAspectClass="aspect-[16/9]"
      dialogMaxWidth="max-w-[28rem]"
      dialogSizes="448px"
      label="Обложка франшизы"
      header={
        <div
          className={`flex items-baseline justify-between gap-2 ${stacked ? "w-full" : "w-40"}`}
        >
          <span className="font-mono-tech text-xs text-muted">обложка</span>
          <span className="font-mono-tech text-[0.6rem] text-faint">16:9</span>
        </div>
      }
      dialogHint={
        <p className="font-mono-tech text-center text-xs text-faint">формат 16:9</p>
      }
      urlInputId="franchise-cover-url"
      urlPlaceholder="https://…/cover.jpg"
      previewUsesRemoteImg={(src) => src.startsWith("blob:") || src.startsWith("http")}
      onFileChange={onFileChange}
      onUrlChange={onUrlChange}
      onUploaded={onUploaded}
    />
  );
}
