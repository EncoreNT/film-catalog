"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "default" | "wide";
}

export function Modal({ open, onClose, title, children, size = "default" }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  const width =
    size === "wide" ? "w-[min(100%-2rem,860px)]" : "w-[min(100%-2rem,640px)]";

  return (
    <dialog
      ref={dialogRef}
      className={`fixed inset-0 z-[100] m-auto ${width} max-h-[90dvh] overflow-auto rounded-[var(--radius)] border border-border bg-bg-elevated p-0 text-text backdrop:bg-black/60 open:animate-in`}
      onClose={onClose}
    >
      <div className="sticky top-0 flex items-center justify-between border-b border-border bg-bg-elevated px-5 py-4">
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
      <div className="p-5">{children}</div>
    </dialog>
  );
}
