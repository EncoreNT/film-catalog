import type { ReactNode } from "react";

interface MachinedCardProps {
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** "machined" — double-bezel nested shell (release/track editors).
   *  "calm" — single hairline + top gold laser slit, no nested bezel.
   *  Use "calm" where the surrounding context already speaks the line/glow
   *  language (franchise forms) so the section stops reading as a boxed-in
   *  double frame. */
  variant?: "machined" | "calm";
}

/* Double-bezel "machined glass" card — the same nested-shell language as the
   release-spec plaques, minus the cinematic effects: a translucent tray
   (bg-bg-elevated/50) with a static gradient hairline frame and a dark
   machined inner core (spec-plaque-core). Used for form sections so the
   editor reads as the same product as the detail page.

   The core deliberately has no overflow-hidden so nested dropdowns (Select)
   can escape the card. The frame is the static gradient-hairline (not the
   animated cinematic shimmer) — calm enough for a working form.

   variant="calm" drops the multicolored outer hairline + inner inset line
   (the "double border") in favor of one hairline and a top-edge gold laser
   slit — the same line-language as the modal crown and empty-reel bay. */
export function MachinedCard({
  children,
  className,
  bodyClassName,
  variant = "machined",
}: MachinedCardProps) {
  if (variant === "calm") {
    return (
      <div
        className={`relative rounded-[16px] border border-border bg-bg-elevated/25 px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName ?? ""} ${className ?? ""}`}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent sm:inset-x-6"
        />
        {children}
      </div>
    );
  }

  return (
    <div
      className={`gradient-hairline relative rounded-[16px] border border-border-strong bg-bg-elevated/50 p-1.5 ${className ?? ""}`}
    >
      <div
        className={`spec-plaque-core relative rounded-[calc(16px-0.375rem)] px-5 py-5 sm:px-6 sm:py-6 ${bodyClassName ?? ""}`}
      >
        {children}
      </div>
    </div>
  );
}

interface CardSectionHeaderProps {
  label: string;
  title: ReactNode;
  className?: string;
}

/* Small section header used inside MachinedCard: a mono-tech gold label
   above a display title — mirrors the MovieReleasePageHeader / PageHeader
   pattern so card titles stop reading like a generic admin dashboard. */
export function CardSectionHeader({
  label,
  title,
  className,
}: CardSectionHeaderProps) {
  return (
    <div className={className}>
      <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-accent/80">
        {label}
      </p>
      <h2 className="font-display mt-1.5 text-xl font-semibold tracking-tight">
        {title}
      </h2>
    </div>
  );
}
