import type { ReactNode } from "react";

export function ReleasePathBlock({
  label,
  meta,
  children,
  tone = "muted",
}: {
  label?: string;
  meta?: string | null;
  children: ReactNode;
  tone?: "muted" | "faint";
}) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-border/60 bg-bg-deep/40 px-3 py-2.5">
      {label ? (
        <p className="font-mono-tech text-[10px] uppercase tracking-[0.12em] text-faint">
          {label}
        </p>
      ) : null}
      <p
        className={`break-all font-mono-tech text-xs leading-relaxed ${
          label ? "mt-1.5" : ""
        } ${tone === "faint" ? "text-faint" : "text-muted"}`}
      >
        {children}
      </p>
      {meta ? (
        <p className="mt-2 font-mono-tech text-[11px] tabular-nums text-faint">{meta}</p>
      ) : null}
    </div>
  );
}
