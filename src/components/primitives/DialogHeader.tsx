"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/primitives/Button";

interface DialogHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  closeDisabled?: boolean;
  closeLabel?: string;
  /** `start` when subtitle may wrap to multiple lines. */
  align?: "center" | "start";
  className?: string;
}

export function DialogHeader({
  eyebrow,
  title,
  subtitle,
  onClose,
  closeDisabled = false,
  closeLabel = "Закрыть",
  align = "center",
  className = "",
}: DialogHeaderProps) {
  return (
    <div
      className={`flex items-${align === "start" ? "start" : "center"} justify-between gap-3 border-b border-border px-5 py-4 ${className}`}
    >
      <div className="min-w-0">
        <p className="font-mono-tech text-accent">{eyebrow}</p>
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        {subtitle != null ? (
          <p className="mt-1 truncate text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      <Button
        variant="ghost"
        onClick={onClose}
        disabled={closeDisabled}
        aria-label={closeLabel}
        className="!min-h-11 !w-11 !p-0"
      >
        <X className="h-5 w-5" />
      </Button>
    </div>
  );
}
