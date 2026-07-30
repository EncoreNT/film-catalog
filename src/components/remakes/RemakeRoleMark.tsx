"use client";

import type { LucideIcon } from "lucide-react";
import {
  Clapperboard,
  Gem,
  GitFork,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { RemakeRole } from "@/generated/prisma/client";
import { remakeRoleLabel } from "@/lib/shared/dictionaries";

const ROLE_MARK: Record<
  RemakeRole,
  {
    Icon: LucideIcon;
    border: string;
    bg: string;
    hoverBorder: string;
    hoverBg: string;
    icon: string;
  }
> = {
  ORIGINAL: {
    Icon: Gem,
    border: "border-accent/50",
    bg: "bg-accent/[0.1]",
    hoverBorder: "hover:border-accent/75",
    hoverBg: "hover:bg-accent/[0.16]",
    icon: "text-accent-bright",
  },
  REMAKE: {
    Icon: GitFork,
    border: "border-neural/50",
    bg: "bg-neural/[0.1]",
    hoverBorder: "hover:border-neural/75",
    hoverBg: "hover:bg-neural/[0.16]",
    icon: "text-neural",
  },
  REIMAGINING: {
    Icon: Sparkles,
    border: "border-cyan/50",
    bg: "bg-cyan/[0.1]",
    hoverBorder: "hover:border-cyan/75",
    hoverBg: "hover:bg-cyan/[0.16]",
    icon: "text-cyan",
  },
  REBOOT: {
    Icon: RotateCcw,
    border: "border-ember/50",
    bg: "bg-ember/[0.1]",
    hoverBorder: "hover:border-ember/75",
    hoverBg: "hover:bg-ember/[0.16]",
    icon: "text-ember-bright",
  },
  ADAPTATION: {
    Icon: Clapperboard,
    border: "border-border-strong",
    bg: "bg-bg-surface/80",
    hoverBorder: "hover:border-muted/60",
    hoverBg: "hover:bg-bg-surface-hover",
    icon: "text-muted",
  },
};

interface RemakeRoleMarkProps {
  role: RemakeRole;
  className?: string;
  /** Родитель задаёт подпись (например, интерактивный тултип). */
  ariaHidden?: boolean;
}

/** Компактная метка роли в группе ремейков (каталог, нижняя строка карточки). */
export function RemakeRoleMark({
  role,
  className = "",
  ariaHidden = false,
}: RemakeRoleMarkProps) {
  const label = remakeRoleLabel(role) ?? role;
  const { Icon, border, bg, hoverBorder, hoverBg, icon } = ROLE_MARK[role];

  return (
    <span
      className={`inline-flex h-[1.125rem] w-[1.125rem] shrink-0 cursor-help items-center justify-center rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors duration-200 ${border} ${bg} ${hoverBorder} ${hoverBg} ${className}`}
      aria-hidden={ariaHidden ? true : undefined}
      aria-label={ariaHidden ? undefined : label}
      title={ariaHidden ? undefined : label}
    >
      <Icon className={`h-3 w-3 ${icon}`} strokeWidth={1.75} aria-hidden />
    </span>
  );
}
