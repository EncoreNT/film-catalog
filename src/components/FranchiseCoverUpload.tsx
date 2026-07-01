"use client";

import { useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { ImagePlus, RefreshCw, Check, Upload } from "lucide-react";
import { franchiseCoverUrl } from "@/lib/franchise-cover-url";
import { Modal } from "./primitives/Modal";
import { Button } from "./primitives/Button";

type Source =
  | { kind: "none" }
  | { kind: "file"; file: File; previewUrl: string }
  | { kind: "url"; url: string };

interface FranchiseCoverUploadProps {
  franchiseId?: number;
  hasCover?: boolean;
  coverVersion?: Date | string | number;
  onFileChange?: (file: File | null) => void;
  onUrlChange?: (url: string | null) => void;
  onUploaded?: () => void;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}

function isRemotePreview(src: string): boolean {
  return src.startsWith("blob:") || src.startsWith("http");
}

export function FranchiseCoverUpload({
  franchiseId,
  hasCover,
  coverVersion,
  onFileChange,
  onUrlChange,
  onUploaded,
}: FranchiseCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>({ kind: "none" });
  const [stored, setStored] = useState(hasCover);
  const [storedVersion, setStoredVersion] = useState(coverVersion);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [urlPreviewFailed, setUrlPreviewFailed] = useState(false);

  const editMode = franchiseId != null;
  const version = storedVersion ?? coverVersion;

  const previewSrc =
    source.kind === "file"
      ? source.previewUrl
      : source.kind === "url"
        ? source.url
        : stored && franchiseId != null && version != null
          ? franchiseCoverUrl(franchiseId, version)
          : null;
  const previewIsRemote = source.kind === "url";

  const openDialog = () => {
    setError(null);
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setDraftUrl("");
    setUrlPreviewFailed(false);
    setDragOver(false);
    if (inputRef.current) inputRef.current.value = "";
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (uploading) return;
    if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setDraftUrl("");
    setUrlPreviewFailed(false);
    setError(null);
    setDialogOpen(false);
  };

  const pickDraftFile = (file: File | null) => {
    if (!file) return;
    setError(null);
    setUrlPreviewFailed(false);
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение.");
      return;
    }
    if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
    setDraftFile(file);
    setDraftPreviewUrl(URL.createObjectURL(file));
    setDraftUrl("");
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    pickDraftFile(event.dataTransfer.files[0] ?? null);
  };

  const applySavedSource = (next: Source) => {
    if (source.kind === "file") URL.revokeObjectURL(source.previewUrl);
    setSource(next);
    setUploaded(true);
  };

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
    setStored(true);
    setStoredVersion(updated.updatedAt);
    onUploaded?.();
  };

  const handleSave = async () => {
    setError(null);

    if (draftFile) {
      setUploading(true);
      try {
        if (editMode) {
          const formData = new FormData();
          formData.append("cover", draftFile);
          await sendCover(formData);
          setSource({ kind: "none" });
          if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
        } else {
          const previewUrl = draftPreviewUrl ?? URL.createObjectURL(draftFile);
          applySavedSource({
            kind: "file",
            file: draftFile,
            previewUrl,
          });
          onUrlChange?.(null);
          onFileChange?.(draftFile);
        }
        setDraftFile(null);
        setDraftPreviewUrl(null);
        setDialogOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка");
      } finally {
        setUploading(false);
      }
      return;
    }

    const url = draftUrl.trim();
    if (!url) {
      setError("Выберите файл или укажите ссылку на изображение.");
      return;
    }
    if (!isValidHttpUrl(url)) {
      setError("Некорректный URL обложки.");
      return;
    }

    setUploading(true);
    try {
      if (editMode) {
        await sendCover(JSON.stringify({ url }), "application/json");
        setSource({ kind: "none" });
      } else {
        applySavedSource({ kind: "url", url });
        onFileChange?.(null);
        onUrlChange?.(url);
      }
      setDraftUrl("");
      setDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setUploading(false);
    }
  };

  const draftUrlValid = draftUrl.trim() ? isValidHttpUrl(draftUrl) : false;
  const canSave = Boolean(draftFile || draftUrlValid);
  const dialogPreviewSrc = draftPreviewUrl ?? (draftUrlValid ? draftUrl.trim() : null);
  const dialogPreviewIsRemote = !draftPreviewUrl && draftUrlValid;

  return (
    <>
      <div className="flex shrink-0 flex-col gap-1.5">
        <div className="flex w-40 items-baseline justify-between gap-2">
          <span className="font-mono-tech text-xs text-muted">обложка</span>
          <span className="font-mono-tech text-[0.6rem] text-faint">16:9</span>
        </div>
        <div className="relative w-40 aspect-[16/9]">
          <button
            type="button"
            onClick={openDialog}
            aria-label={
              previewSrc ? "Обложка франшизы: заменить" : "Обложка франшизы: загрузить"
            }
            className="group focus-ring relative h-full w-full overflow-hidden rounded-[var(--radius-sm)] border border-border bg-bg-surface transition-colors hover:border-border-strong"
          >
            {previewSrc ? (
              previewIsRemote || isRemotePreview(previewSrc) ? (
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
              <span className="flex h-full w-full items-center justify-center text-faint transition-colors group-hover:text-muted">
                <ImagePlus className="h-5 w-5" aria-hidden />
              </span>
            )}

            <span
              className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-bg-deep/70 text-center opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              aria-hidden
            >
              {previewSrc ? (
                <>
                  <RefreshCw className="h-4 w-4 text-accent" />
                  <span className="text-[0.65rem] font-medium text-text">Заменить</span>
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 text-accent" />
                  <span className="text-[0.65rem] font-medium text-text">Загрузить</span>
                </>
              )}
            </span>
          </button>

          {uploaded && !dialogOpen ? (
            <span className="pointer-events-none absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent/90">
              <Check className="h-3 w-3 text-bg-deep" aria-hidden />
            </span>
          ) : null}
        </div>
      </div>

      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        title={previewSrc ? "Заменить обложку" : "Добавить обложку"}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={closeDialog} disabled={uploading}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              loading={uploading}
              disabled={!canSave || uploading}
              onClick={() => void handleSave()}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="font-mono-tech text-center text-xs text-faint">формат 16:9</p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`focus-ring relative mx-auto flex aspect-[16/9] w-full max-w-[28rem] cursor-pointer flex-col items-center justify-center gap-3 overflow-hidden rounded-[var(--radius)] border-2 border-dashed bg-bg-surface/40 px-4 py-6 text-center transition-colors ${
              dragOver
                ? "border-accent/70 bg-accent/10"
                : "border-border-strong hover:border-accent/50 hover:bg-bg-surface-hover"
            }`}
          >
            {dialogPreviewSrc && !dialogPreviewIsRemote ? (
              <Image
                src={dialogPreviewSrc}
                alt="Предпросмотр"
                fill
                unoptimized
                sizes="448px"
                className="object-cover"
              />
            ) : dialogPreviewSrc && dialogPreviewIsRemote ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dialogPreviewSrc}
                alt="Предпросмотр по ссылке"
                className="absolute inset-0 h-full w-full object-cover"
                onLoad={() => setUrlPreviewFailed(false)}
                onError={() => setUrlPreviewFailed(true)}
              />
            ) : (
              <>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong bg-bg-elevated text-accent">
                  <Upload className="h-5 w-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text">
                    Перетащите файл сюда
                  </p>
                  <p className="text-xs text-muted">
                    или нажмите, чтобы выбрать · 16:9
                  </p>
                </div>
              </>
            )}

            {dialogPreviewSrc ? (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg-deep/90 to-transparent px-3 py-2">
                <span className="font-mono-tech text-[0.65rem] text-muted">
                  {draftFile ? draftFile.name : "предпросмотр по ссылке"}
                </span>
              </span>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickDraftFile(e.target.files?.[0] ?? null)}
            className="sr-only"
            aria-hidden
          />

          <div className="relative flex items-center gap-3">
            <span className="h-px flex-1 bg-border" aria-hidden />
            <span className="font-mono-tech text-xs text-faint">или ссылка</span>
            <span className="h-px flex-1 bg-border" aria-hidden />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="franchise-cover-url"
              className="font-mono-tech block text-xs text-muted"
            >
              URL изображения
            </label>
            <input
              id="franchise-cover-url"
              value={draftUrl}
              onChange={(e) => {
                setDraftUrl(e.target.value);
                setUrlPreviewFailed(false);
                if (draftPreviewUrl) URL.revokeObjectURL(draftPreviewUrl);
                setDraftFile(null);
                setDraftPreviewUrl(null);
                setError(null);
              }}
              placeholder="https://…/cover.jpg"
              inputMode="url"
              className="focus-ring min-h-11 w-full rounded-[var(--radius-sm)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
            />
            {draftUrlValid && urlPreviewFailed ? (
              <p className="text-xs text-muted">
                Не удалось показать предпросмотр — ссылку всё равно можно сохранить.
              </p>
            ) : null}
          </div>

          {error ? (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
