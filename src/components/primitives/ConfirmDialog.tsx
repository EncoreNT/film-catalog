"use client";

import { useId, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { NativeDialog } from "./NativeDialog";

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
  const titleId = useId();
  const descId = useId();

  const isDanger = tone === "danger";
  const iconWrap = isDanger
    ? "border-danger/30 bg-danger/10 text-danger"
    : "border-accent/30 bg-accent/10 text-accent";

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      preventCancel={loading}
      zIndex={110}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,440px)] max-w-[440px] flex-col rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
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
          <div
            id={descId}
            className="mt-2 space-y-2 text-sm leading-relaxed text-muted"
          >
            {description}
          </div>
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
    </NativeDialog>
  );
}
