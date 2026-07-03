"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  zIndex?: number;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** When true, Escape / backdrop cancel is suppressed (e.g. while saving). */
  preventCancel?: boolean;
}

export function NativeDialog({
  open,
  onClose,
  children,
  className,
  zIndex,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  preventCancel = false,
}: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

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
      if (!preventCancel) onClose();
    };
    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, [open, onClose, preventCancel]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className={className}
      style={zIndex != null ? { zIndex } : undefined}
      onClose={onClose}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
    >
      {children}
    </dialog>
  );
}
