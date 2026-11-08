"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import Image from "next/image";
import {
  Check,
  ClipboardPaste,
  ImagePlus,
  Link2,
  Loader2,
  Pencil,
  Upload,
  X,
} from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { uploadCover } from "@/lib/api/client";
import {
  COVER_MAX_BYTES,
  coverExtFromMime,
  isCoverImageMime,
} from "@/lib/covers/cover-formats";
import { formatBytes } from "@/lib/shared/format-bytes";
import "./image-cover-upload.css";

export interface ImageCoverUploadProps {
  /** Existing entity id (edit mode). Omit in create mode to buffer the pick. */
  entityId?: number;
  /** Existing cover on disk (edit mode). */
  hasCover?: boolean;
  /** Bumps when the stored cover changes (typically entity.updatedAt). */
  coverVersion?: Date | string | number;
  buildStoredUrl: (id: number, version: Date | string | number) => string;
  uploadPath: (id: number) => string;
  aspectClass: string;
  thumbnailClassName?: string;
  thumbnailSizes: string;
  dialogAspectClass: string;
  dialogMaxWidth: string;
  dialogSizes: string;
  label: string;
  emptyLabel?: string;
  showAction?: boolean;
  header?: ReactNode;
  dialogHint?: ReactNode;
  urlInputId: string;
  urlPlaceholder: string;
  onFileChange?: (file: File | null) => void;
  onUrlChange?: (url: string | null) => void;
  onUploaded?: () => void;
}

function isValidHttpUrl(value: string): boolean {
  try {
    return /^https?:$/.test(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

export function ImageCoverUpload({
  entityId,
  hasCover,
  coverVersion,
  buildStoredUrl,
  uploadPath,
  aspectClass,
  thumbnailClassName,
  thumbnailSizes,
  dialogAspectClass,
  dialogMaxWidth,
  dialogSizes,
  label,
  emptyLabel,
  showAction = false,
  header,
  dialogHint,
  urlInputId,
  urlPlaceholder,
  onFileChange,
  onUrlChange,
  onUploaded,
}: ImageCoverUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const urls = useRef(new Set<string>());
  const session = useRef(0);
  const [localSource, setLocalSource] = useState<string | null>(null);
  const [stored, setStored] = useState(hasCover);
  const [storedVersion, setStoredVersion] = useState(coverVersion);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [readingClipboard, setReadingClipboard] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dimensions, setDimensions] = useState<string | null>(null);
  const editMode = entityId != null;
  const version = storedVersion ?? coverVersion;
  const previewSrc =
    localSource ??
    (stored && entityId != null && version != null
      ? buildStoredUrl(entityId, version)
      : null);
  const validUrl = isValidHttpUrl(draftUrl);
  const candidate = draftPreviewUrl ?? (validUrl ? draftUrl.trim() : null);
  const dialogPreview = candidate ?? previewSrc;
  const hasCandidate = !!draftFile || validUrl;

  const revoke = useCallback(
    (url: string | null) => {
      if (url && urls.current.delete(url)) URL.revokeObjectURL(url);
    },
    [urls],
  );
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
      session.current += 1;
    },
    [urls],
  );

  const openDialog = () => {
    session.current += 1;
    revoke(draftPreviewUrl);
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setDraftUrl("");
    setError(null);
    setPreviewFailed(false);
    setDimensions(null);
    setDragOver(false);
    setDialogOpen(true);
  };
  const closeDialog = () => {
    if (uploading) return;
    session.current += 1;
    revoke(draftPreviewUrl);
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setDraftUrl("");
    setError(null);
    setReadingClipboard(false);
    setDialogOpen(false);
  };
  const pickFile = useCallback(
    (file: File | null) => {
      if (!file || uploading) return;
      session.current += 1;
      setReadingClipboard(false);
      if (!isCoverImageMime(file.type)) {
        setError("Выберите изображение: JPG, PNG, WebP, GIF или AVIF.");
        return;
      }
      if (file.size > COVER_MAX_BYTES) {
        setError(
          `Изображение слишком большое. Максимум ${formatBytes(COVER_MAX_BYTES, { unit: "short" })}.`,
        );
        return;
      }
      revoke(draftPreviewUrl);
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      setDraftFile(file);
      setDraftPreviewUrl(url);
      setDraftUrl("");
      setError(null);
      setPreviewFailed(false);
      setDimensions(null);
    },
    [draftPreviewUrl, revoke, uploading, urls],
  );

  useEffect(() => {
    if (!dialogOpen || uploading) return;
    const paste = (event: ClipboardEvent) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === "file" && item.type.startsWith("image/"))
        ?.getAsFile();
      if (file) {
        event.preventDefault();
        pickFile(file);
      }
    };
    document.addEventListener("paste", paste);
    return () => document.removeEventListener("paste", paste);
  }, [dialogOpen, uploading, pickFile]);

  const readClipboard = async () => {
    if (!navigator.clipboard?.read) {
      setError(
        "Нажмите Ctrl+V или ⌘V в этом окне, чтобы вставить изображение.",
      );
      return;
    }
    const requestSession = session.current;
    setReadingClipboard(true);
    setError(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((mime) => mime.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        if (requestSession !== session.current) return;
        pickFile(
          new File([blob], `clipboard${coverExtFromMime(type) ?? ".png"}`, {
            type,
          }),
        );
        return;
      }
      if (requestSession === session.current)
        setError(
          "В буфере нет изображения. Скопируйте картинку или сделайте скриншот, затем вставьте снова.",
        );
    } catch {
      if (requestSession === session.current)
        setError(
          "Браузер не разрешил чтение буфера. Нажмите Ctrl+V или ⌘V в этом окне.",
        );
    } finally {
      if (requestSession === session.current) setReadingClipboard(false);
    }
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    pickFile(event.dataTransfer.files[0] ?? null);
  };
  const clearCandidate = () => {
    session.current += 1;
    setReadingClipboard(false);
    revoke(draftPreviewUrl);
    setDraftFile(null);
    setDraftPreviewUrl(null);
    setDraftUrl("");
    setError(null);
    setPreviewFailed(false);
    setDimensions(null);
    if (inputRef.current) inputRef.current.value = "";
  };
  const handleSave = async () => {
    if (!hasCandidate || uploading) return;
    setError(null);
    setUploading(true);
    try {
      if (editMode) {
        const result = await uploadCover(
          uploadPath(entityId),
          draftFile
            ? { kind: "file", file: draftFile }
            : { kind: "url", url: draftUrl.trim() },
        );
        setStored(true);
        setStoredVersion(result.updatedAt);
        setLocalSource(null);
        revoke(draftPreviewUrl);
        onUploaded?.();
      } else {
        revoke(localSource);
        setLocalSource(candidate);
        onFileChange?.(draftFile);
        onUrlChange?.(draftFile ? null : draftUrl.trim());
      }
      session.current += 1;
      setDraftFile(null);
      setDraftPreviewUrl(null);
      setDraftUrl("");
      setUploaded(true);
      setDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Не удалось сохранить обложку. Повторите попытку.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="cover-editor-trigger">
        {header}
        <div
          className={thumbnailClassName ?? `relative shrink-0 ${aspectClass}`}
        >
          <button
            type="button"
            onClick={openDialog}
            aria-label={
              previewSrc ? `${label}: заменить` : `${label}: загрузить`
            }
            className="cover-editor-image focus-ring"
          >
            {previewSrc ? (
              <Image
                src={previewSrc}
                alt={label}
                fill
                unoptimized
                sizes={thumbnailSizes}
                className="object-cover"
              />
            ) : (
              <span className="cover-editor-empty">
                <ImagePlus size={emptyLabel ? 32 : 20} aria-hidden />
                {emptyLabel && <span>{emptyLabel}</span>}
              </span>
            )}
            <span className="cover-editor-hover" aria-hidden>
              <Pencil size={22} />
              {previewSrc ? "Изменить обложку" : "Добавить обложку"}
            </span>
          </button>
          {uploaded && (
            <span className="cover-editor-applied" role="status">
              <Check size={14} />
              <span className="sr-only">
                {editMode ? "Обложка сохранена" : "Обложка выбрана"}
              </span>
            </span>
          )}
        </div>
        {showAction && (
          <button
            type="button"
            className="cover-editor-action focus-ring"
            onClick={openDialog}
          >
            <ImagePlus size={17} aria-hidden />
            {previewSrc ? "Изменить обложку" : "Добавить обложку"}
          </button>
        )}
      </div>
      <Modal
        open={dialogOpen}
        onClose={closeDialog}
        preventCancel={uploading}
        title={previewSrc ? "Заменить обложку" : "Добавить обложку"}
        size="wide"
        bodyClassName="cover-dialog-body"
        footer={
          <>
            <span className="cover-dialog-save-note">
              {editMode
                ? "Обложка сохраняется отдельно от остальных полей карточки."
                : "Обложка сохранится при создании карточки."}
            </span>
            <Button
              type="button"
              variant="ghost"
              onClick={closeDialog}
              disabled={uploading}
            >
              Отмена
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void handleSave()}
              loading={uploading}
              disabled={!hasCandidate || uploading || readingClipboard}
            >
              {editMode ? "Сохранить обложку" : "Выбрать обложку"}
            </Button>
          </>
        }
      >
        <div
          className="cover-workspace"
          data-drag-over={dragOver}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("Files")) {
              event.preventDefault();
              setDragOver(true);
            }
          }}
          onDragLeave={(event) => {
            if (
              !event.currentTarget.contains(event.relatedTarget as Node | null)
            )
              setDragOver(false);
          }}
          onDrop={onDrop}
        >
          <div className="cover-preview-column">
            <p className="cover-preview-label">
              {hasCandidate
                ? "Новая обложка"
                : previewSrc
                  ? "Текущая обложка"
                  : "Предпросмотр"}
            </p>
            <div
              className={`cover-preview ${dialogAspectClass} ${dialogMaxWidth}`}
            >
              {dialogPreview ? (
                <Image
                  key={dialogPreview}
                  src={dialogPreview}
                  alt={
                    hasCandidate
                      ? "Предпросмотр новой обложки"
                      : "Текущая обложка"
                  }
                  fill
                  unoptimized
                  sizes={dialogSizes}
                  className="object-cover"
                  onLoad={(event) => {
                    setPreviewFailed(false);
                    setDimensions(
                      `${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`,
                    );
                  }}
                  onError={() => setPreviewFailed(true)}
                />
              ) : (
                <div className="cover-preview-empty">
                  <ImagePlus size={32} aria-hidden />
                  <span>Здесь появится обложка</span>
                </div>
              )}
              {previewFailed && (
                <div className="cover-preview-error">
                  Не удалось показать изображение. Проверьте ссылку или выберите
                  другой файл.
                </div>
              )}
            </div>
            <p className="cover-preview-caption">
              {dimensions ?? "Так обложка будет выглядеть в каталоге"}
            </p>
            {dialogHint}
            {hasCandidate && (
              <button
                type="button"
                className="cover-reset focus-ring"
                disabled={uploading}
                onClick={clearCandidate}
              >
                <X size={14} aria-hidden />
                Сбросить выбор
              </button>
            )}
          </div>
          <div className="cover-source-column">
            <p className="cover-source-intro">
              Выберите изображение удобным способом
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              aria-label="Файл обложки"
              disabled={uploading}
              onChange={(event) => {
                pickFile(event.target.files?.[0] ?? null);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="cover-source-file focus-ring"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              <Upload size={24} aria-hidden />
              <strong>
                {draftFile ? "Выбрать другой файл" : "Выбрать файл"}
              </strong>
              <span>или перетащите изображение в это окно</span>
              <small>
                JPG, PNG, WebP и другие форматы · до{" "}
                {formatBytes(COVER_MAX_BYTES, { unit: "short" })}
              </small>
            </button>
            <button
              type="button"
              className="cover-source-paste focus-ring"
              disabled={uploading || readingClipboard}
              onClick={() => void readClipboard()}
            >
              {readingClipboard ? (
                <Loader2 size={19} className="animate-spin" aria-hidden />
              ) : (
                <ClipboardPaste size={19} aria-hidden />
              )}
              <span>Вставить из буфера</span>
              <kbd>Ctrl / ⌘ V</kbd>
            </button>
            <div className="cover-source-url">
              <label htmlFor={urlInputId}>
                <Link2 size={16} aria-hidden />
                Ссылка на изображение
              </label>
              <input
                id={urlInputId}
                type="url"
                spellCheck={false}
                autoComplete="off"
                value={draftUrl}
                placeholder={urlPlaceholder}
                disabled={uploading}
                onKeyDown={(event) => {
                  // This dialog lives inside entity forms. Enter in the URL
                  // must not submit the underlying movie/franchise fields.
                  if (event.key === "Enter") event.preventDefault();
                }}
                onChange={(event) => {
                  session.current += 1;
                  setReadingClipboard(false);
                  revoke(draftPreviewUrl);
                  setDraftFile(null);
                  setDraftPreviewUrl(null);
                  setDraftUrl(event.target.value);
                  setError(null);
                  setPreviewFailed(false);
                  setDimensions(null);
                }}
              />
              <p>Вставьте прямую ссылку на картинку для предпросмотра.</p>
            </div>
            {error && (
              <p className="cover-source-error" role="alert">
                {error}
              </p>
            )}
            <p className="cover-source-footer">
              {hasCandidate
                ? "Проверьте предпросмотр и подтвердите выбор."
                : "Можно вставить скриншот через Ctrl+V или ⌘V прямо в этом окне."}
            </p>
          </div>
        </div>
      </Modal>
    </>
  );
}
