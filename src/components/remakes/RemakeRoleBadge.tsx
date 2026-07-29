import type { RemakeRole } from "@/generated/prisma/client";
import { remakeRoleLabel } from "@/lib/shared/dictionaries";

interface RemakeRoleBadgeProps {
  role: RemakeRole;
  size?: "xs" | "sm";
  className?: string;
}

const ROLE_TONE: Record<RemakeRole, string> = {
  ORIGINAL:
    "border-accent/45 bg-accent/10 text-accent-bright",
  REMAKE:
    "border-neural/45 bg-neural/10 text-neural",
  REIMAGINING:
    "border-cyan/45 bg-cyan/10 text-cyan",
  REBOOT:
    "border-ember/45 bg-ember/10 text-ember-bright",
  ADAPTATION:
    "border-border-strong bg-bg-surface text-muted",
};

/** Inset panel for «это текущий фильм» — stronger border than badge alone. */
export const REMAKE_ROLE_PANEL_TONE: Record<RemakeRole, string> = {
  ORIGINAL: "border-accent/40 border-l-accent bg-accent/[0.07]",
  REMAKE: "border-neural/40 border-l-neural bg-neural/[0.07]",
  REIMAGINING: "border-cyan/40 border-l-cyan bg-cyan/[0.07]",
  REBOOT: "border-ember/40 border-l-ember bg-ember/[0.07]",
  ADAPTATION: "border-border-strong border-l-muted bg-bg-surface/80",
};

export function RemakeRoleBadge({
  role,
  size = "sm",
  className = "",
}: RemakeRoleBadgeProps) {
  const label = remakeRoleLabel(role) ?? role;
  const sizeClass =
    size === "xs"
      ? "px-1.5 py-[1px] text-[0.55rem]"
      : "px-2 py-0.5 text-[0.62rem]";

  return (
    <span
      className={`font-mono-tech inline-flex shrink-0 items-center rounded-full border font-medium uppercase tracking-wide ${ROLE_TONE[role]} ${sizeClass} ${className}`}
    >
      {label}
    </span>
  );
}
