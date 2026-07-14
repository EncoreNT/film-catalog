"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./Button";
import { NativeDialog } from "./NativeDialog";

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
  const width =
    size === "xwide"
      ? "w-[min(100%-2rem,1080px)]"
      : size === "wide"
        ? "w-[min(100%-2rem,860px)]"
        : "w-[min(100%-2rem,640px)]";

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      zIndex={100}
      className={`fixed inset-0 m-auto flex ${width} max-h-[90dvh] flex-col overflow-hidden rounded-[var(--radius)] border border-border-strong bg-bg-elevated/85 p-0 text-text shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl backdrop:bg-black/60 open:animate-in`}
    >
      {/* Top-edge laser slit — warm gold→neural hairline reads as a projector
          light leak at the modal's crown, the same line-language as tier-laser-top
          on cards. Pointer-events-none, aria-hidden. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/70 to-transparent"
      />

      <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
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
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-border px-5 py-4">
          {footer}
        </div>
      ) : null}
    </NativeDialog>
  );
}
