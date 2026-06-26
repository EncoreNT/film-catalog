"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

type Tone = "danger" | "accent";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: Tone;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  tone = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      if (!loading) onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [open, loading, onClose]);

  if (!open) return null;

  const isDanger = tone === "danger";
  const iconWrap = isDanger
    ? "border-danger/30 bg-danger/10 text-danger"
    : "border-accent/30 bg-accent/10 text-accent";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="confirm-dialog fixed inset-0 z-[110] m-auto flex w-[min(100%-2rem,440px)] max-w-[440px] flex-col rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      onClose={onClose}
    >
      <div className="flex items-start gap-4 p-5 pb-4">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border ${iconWrap}`}
          aria-hidden
        >
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2
            id={titleId}
            className="font-display text-lg font-semibold leading-tight"
          >
            {title}
          </h2>
          <p
            id={descId}
            className="mt-2 text-sm leading-relaxed text-muted"
          >
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        <Button
          variant="ghost"
          type="button"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={isDanger ? "danger" : "primary"}
          type="button"
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
