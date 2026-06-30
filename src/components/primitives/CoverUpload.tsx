"use client";

import { useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { ImagePlus, RefreshCw, Loader2, Check, X, Link2 } from "lucide-react";
import { movieCoverUrl } from "@/lib/cover-url";

type Source =
  | { kind: "none" }
  | { kind: "file"; file: File; previewUrl: string }
  | { kind: "url"; url: string };

interface CoverUploadProps {
  /** Existing movie id (edit mode). Omit in create mode to buffer the pick. */
  movieId?: number;
  /** Existing cover path (edit mode) — when set, shows the stored cover. */
  hasCover?: boolean;
  /** Bumps when the stored cover changes (typically movie.updatedAt). */
  coverVersion?: Date | string | number;
  /** Create mode: emitted with a buffered File when a file is picked. */
  onFileChange?: (file: File | null) => void;
  /** Create mode: emitted with a buffered URL when a URL is pasted. */
  onUrlChange?: (url: string | null) => void;
  /** Edit mode: called after a successful upload so the parent can refresh. */
  onUploaded?: () => void;
  /** Accessible label for the clickable cover. */
  label?: string;
  /** Kept for API symmetry; not rendered here. */
  hint?: ReactNode;
}

export function CoverUpload({
  movieId,
  hasCover,
  coverVersion,
  onFileChange,
  onUrlChange,
  onUploaded,
  label = "Обложка",
}: CoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>({ kind: "none" });
  const [stored, setStored] = useState(hasCover);
  const [storedVersion, setStoredVersion] = useState(coverVersion);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");

  const editMode = movieId != null;

  const version = storedVersion ?? coverVersion;

  const previewSrc =
    source.kind === "file"
      ? source.previewUrl
      : source.kind === "url"
        ? source.url
        : stored && movieId != null && version != null
          ? movieCoverUrl(movieId, version)
          : null;
  const previewIsRemote = source.kind === "url";
  const busy = uploading;
  const hasPick = source.kind !== "none";

  const clearPick = () => {
    if (source.kind === "file") URL.revokeObjectURL(source.previewUrl);
    setSource({ kind: "none" });
    setUploaded(false);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onFileChange?.(null);
    onUrlChange?.(null);
  };

  const pickFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setUploaded(false);
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение.");
      return;
    }
    if (source.kind === "file") URL.revokeObjectURL(source.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    setSource({ kind: "file", file, previewUrl });
    setUrlOpen(false);
    setUrlDraft("");
    onUrlChange?.(null);
    onFileChange?.(file);
    if (editMode && movieId != null) void uploadFile(file);
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    setError(null);
    setUploaded(false);
    if (!url) return;
    try {
      const u = new URL(url);
      if (!/^https?:$/.test(u.protocol)) throw new Error("protocol");
    } catch {
      setError("Некорректный URL обложки.");
      return;
    }
    if (source.kind === "file") URL.revokeObjectURL(source.previewUrl);
    setSource({ kind: "url", url });
    setUrlOpen(false);
    onFileChange?.(null);
    onUrlChange?.(url);
    if (editMode && movieId != null) void uploadUrl(url);
  };

  const uploadFile = async (file: File) => {
    if (movieId == null) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("cover", file);
      await sendCover(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setUploading(false);
    }
  };

  const uploadUrl = async (url: string) => {
    if (movieId == null) return;
    setUploading(true);
    setError(null);
    try {
      await sendCover(JSON.stringify({ url }), "application/json");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setUploading(false);
    }
  };

  const sendCover = async (body: BodyInit, contentType?: string) => {
    const res = await fetch(`/api/movies/${movieId}/cover`, {
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
    setStored(true);
    setStoredVersion(updated.updatedAt);
    if (source.kind === "file") URL.revokeObjectURL(source.previewUrl);
    setSource({ kind: "none" });
    onUploaded?.();
  };

  const trigger = () => inputRef.current?.click();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative h-28 w-[5.25rem] shrink-0">
        <button
          type="button"
          onClick={trigger}
          aria-label={previewSrc ? `${label}: заменить` : `${label}: загрузить`}
          className="group focus-ring relative h-full w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg-surface transition-colors hover:border-border-strong"
        >
          {previewSrc ? (
            previewIsRemote ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt={label}
                className="h-full w-full object-cover"
                onError={() => setError("Не удалось загрузить изображение по ссылке.")}
              />
            ) : (
              <Image
                src={previewSrc}
                alt={label}
                fill
                unoptimized
                sizes="84px"
                className="object-cover"
              />
            )
          ) : (
            <span className="flex h-full w-full items-center justify-center text-faint transition-colors group-hover:text-muted">
              <ImagePlus className="h-5 w-5" aria-hidden />
            </span>
          )}

          <span
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-scrim/70 text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            aria-hidden
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin text-screen-accent" />
            ) : previewSrc ? (
              <>
                <RefreshCw className="h-4 w-4 text-screen-accent" />
                <span className="text-[0.65rem] font-medium text-on-scrim">Заменить</span>
              </>
            ) : (
              <>
                <ImagePlus className="h-4 w-4 text-screen-accent" />
                <span className="text-[0.65rem] font-medium text-on-scrim">Загрузить</span>
              </>
            )}
          </span>
        </button>

        {busy ? (
          <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-scrim/80">
            <Loader2 className="h-3 w-3 animate-spin text-screen-accent" aria-hidden />
          </span>
        ) : uploaded ? (
          <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent/90">
            <Check className="h-3 w-3 text-on-accent" aria-hidden />
          </span>
        ) : null}

        {hasPick && !busy ? (
          <button
            type="button"
            onClick={clearPick}
            aria-label="Убрать обложку"
            className="focus-ring absolute left-1 top-1 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full bg-scrim/80 text-on-scrim/70 transition-colors hover:text-danger"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        className="sr-only"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => setUrlOpen((v) => !v)}
        className="focus-ring flex w-[5.25rem] items-center justify-center gap-1 rounded-[var(--radius-sm)] py-1 text-[0.65rem] text-muted transition-colors hover:text-accent"
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
                applyUrl();
              }
            }}
            placeholder="https://…/poster.jpg"
            inputMode="url"
            className="focus-ring min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text placeholder:text-muted/60"
          />
          <button
            type="button"
            onClick={applyUrl}
            className="focus-ring shrink-0 rounded-[var(--radius-sm)] bg-accent px-2.5 py-1.5 text-xs font-medium text-on-accent transition-opacity hover:opacity-90"
          >
            Ок
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="max-w-[14rem] text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
