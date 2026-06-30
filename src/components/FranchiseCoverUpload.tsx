"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Check, Link2 } from "lucide-react";
import { franchiseCoverUrl } from "@/lib/franchise-cover-url";

interface FranchiseCoverUploadProps {
  franchiseId?: number;
  hasCover?: boolean;
  coverVersion?: Date | string | number;
  onFileChange?: (file: File | null) => void;
  onUrlChange?: (url: string | null) => void;
  onUploaded?: () => void;
}

export function FranchiseCoverUpload({
  franchiseId,
  hasCover,
  coverVersion,
  onFileChange,
  onUrlChange,
  onUploaded,
}: FranchiseCoverUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [storedVersion, setStoredVersion] = useState(coverVersion);

  const editMode = franchiseId != null;
  const version = storedVersion ?? coverVersion;
  const previewSrc =
    localPreview ??
    (hasCover && franchiseId != null && version != null
      ? franchiseCoverUrl(franchiseId, version)
      : null);

  const sendCover = async (body: BodyInit, contentType?: string) => {
    if (franchiseId == null) return;
    const res = await fetch(`/api/franchises/${franchiseId}/cover`, {
      method: "POST",
      headers: contentType ? { "Content-Type": contentType } : undefined,
      body,
    });
    if (!res.ok) {
      const d = await res.json().catch(() => null);
      throw new Error(d?.error ?? "Не удалось загрузить обложку");
    }
    const updated = (await res.json()) as { updatedAt: string };
    setUploaded(true);
    setStoredVersion(updated.updatedAt);
    setLocalPreview(null);
    onUploaded?.();
  };

  const pickFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение.");
      return;
    }
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);
    onFileChange?.(file);
    onUrlChange?.(null);
    if (editMode) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("cover", file);
        await sendCover(formData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
      } finally {
        setUploading(false);
      }
    }
  };

  const applyUrl = async () => {
    const url = urlDraft.trim();
    if (!url) return;
    setError(null);
    try {
      new URL(url);
    } catch {
      setError("Некорректный URL.");
      return;
    }
    setLocalPreview(url);
    onUrlChange?.(url);
    onFileChange?.(null);
    if (editMode) {
      setUploading(true);
      try {
        await sendCover(JSON.stringify({ url }), "application/json");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex w-40 items-baseline justify-between gap-2">
        <label className="font-mono-tech text-xs text-muted">обложка</label>
        <span className="font-mono-tech text-[0.6rem] text-faint">16:9</span>
      </div>
      <div className="relative w-40 aspect-[16/9]">
        <label className="group focus-ring relative flex h-full w-full cursor-pointer overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg-surface transition-colors hover:border-border-strong">
          {previewSrc ? (
            previewSrc.startsWith("blob:") || previewSrc.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt="Обложка франшизы"
                className="h-full w-full object-cover"
              />
            ) : (
              <Image
                src={previewSrc}
                alt="Обложка франшизы"
                fill
                unoptimized
                sizes="160px"
                className="object-cover"
              />
            )
          ) : (
            <span className="flex h-full w-full items-center justify-center text-faint">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </span>
          )}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => void pickFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {uploading ? (
          <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-scrim/80">
            <Loader2 className="h-3 w-3 animate-spin text-screen-accent" aria-hidden />
          </span>
        ) : uploaded ? (
          <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent/90">
            <Check className="h-3 w-3 text-on-accent" aria-hidden />
          </span>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => setUrlOpen((v) => !v)}
        className="focus-ring flex w-40 items-center justify-center gap-1 rounded-[var(--radius-sm)] py-1 text-[0.65rem] text-muted transition-colors hover:text-accent"
        aria-expanded={urlOpen}
      >
        <Link2 className="h-3 w-3" aria-hidden />
        по ссылке
      </button>
      {urlOpen ? (
        <div className="flex w-56 items-center gap-1.5">
          <input
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void applyUrl();
              }
            }}
            placeholder="https://…/poster.jpg"
            className="focus-ring min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text"
          />
          <button
            type="button"
            onClick={() => void applyUrl()}
            className="focus-ring shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1.5 text-xs font-medium text-on-accent"
          >
            Ок
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
