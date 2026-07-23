"use client";

import type { ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/primitives/Button";
import { NativeDialog } from "@/components/primitives/NativeDialog";

export type TransferDialogAccent = "accent" | "neural";

const EYEBROW_CLASS: Record<TransferDialogAccent, string> = {
  accent: "text-accent",
  neural: "text-neural",
};

export interface TransferDialogFooterAction {
  label: string;
  variant: "ghost" | "secondary" | "primary";
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

interface ReleaseTransferDialogProps {
  open: boolean;
  onClose: () => void;
  preventCancel?: boolean;
  accent?: TransferDialogAccent;
  eyebrow: string;
  title: string;
  titleId: string;
  statusMeta?: { label: string; badgeClass: string } | null;
  statusRunning?: boolean;
  children: React.ReactNode;
  footerActions: TransferDialogFooterAction[];
}

export function ReleaseTransferDialog({
  open,
  onClose,
  preventCancel = false,
  accent = "accent",
  eyebrow,
  title,
  titleId,
  statusMeta,
  statusRunning = false,
  children,
  footerActions,
}: ReleaseTransferDialogProps) {
  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      preventCancel={preventCancel}
      zIndex={110}
      ariaLabelledBy={titleId}
      className="confirm-dialog fixed inset-0 m-auto flex w-[min(100%-2rem,560px)] max-w-[560px] min-w-0 flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 backdrop:backdrop-blur-sm"
    >
      <div className="min-w-0 space-y-4 p-5">
        <div className="min-w-0">
          <p
            className={`font-mono-tech text-[11px] uppercase tracking-[0.18em] ${EYEBROW_CLASS[accent]}`}
          >
            {eyebrow}
          </p>
          <div className="mt-1 flex min-w-0 items-start justify-between gap-3">
            <h2
              id={titleId}
              className="min-w-0 font-display text-lg font-semibold leading-tight"
            >
              {title}
            </h2>
            {statusMeta ? (
              <span
                className={`font-mono-tech inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] ${statusMeta.badgeClass}`}
              >
                {statusRunning ? (
                  <LoaderCircle
                    className="h-3 w-3 animate-spin"
                    aria-hidden
                  />
                ) : null}
                {statusMeta.label}
              </span>
            ) : null}
          </div>
        </div>
        {children}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
        {footerActions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            loading={action.loading}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </NativeDialog>
  );
}
