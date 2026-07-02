"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "default" | "wide" | "xwide";
  bodyClassName?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "default",
  bodyClassName,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const width =
    size === "xwide"
      ? "w-[min(100%-2rem,1080px)]"
      : size === "wide"
        ? "w-[min(100%-2rem,860px)]"
        : "w-[min(100%-2rem,640px)]";

  return (
    <dialog
      ref={dialogRef}
      className={`fixed inset-0 z-[100] m-auto flex ${width} max-h-[90dvh] flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 open:animate-in`}
      onClose={onClose}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg-elevated px-5 py-4">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <Button
          variant="ghost"
          onClick={onClose}
          aria-label="Закрыть"
          className="!min-h-11 !w-11 !p-0"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div
        className={`scroll-subtle min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 ${bodyClassName ?? ""}`}
      >
        {children}
      </div>

      {footer ? (
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border bg-bg-elevated px-5 py-4">
          {footer}
        </div>
      ) : null}
    </dialog>
  );
}
