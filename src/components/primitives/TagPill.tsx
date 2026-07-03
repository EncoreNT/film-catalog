import Link from "next/link";
import type { ReactNode } from "react";

interface TagPillProps {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  className?: string;
}

const baseClass =
  "font-mono-tech inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-bg-elevated px-3 py-1 text-xs text-text";

export function TagPill({ children, href, icon, className = "" }: TagPillProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={`focus-ring transition-colors hover:border-accent/50 hover:text-accent ${baseClass} ${className}`}
      >
        {icon}
        {children}
      </Link>
    );
  }

  return (
    <span className={`${baseClass} ${className}`}>
      {icon}
      {children}
    </span>
  );
}
