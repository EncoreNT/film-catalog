import type { ReactNode } from "react";

interface TooltipListPanelProps {
  children: ReactNode;
  widthClass?: string;
}

export function TooltipListPanel({
  children,
  widthClass = "w-[min(18rem,calc(100vw-2rem))]",
}: TooltipListPanelProps) {
  return <div className={`${widthClass} p-2`}>{children}</div>;
}

interface TooltipListHeaderProps {
  label: string;
  count: number;
}

export function TooltipListHeader({ label, count }: TooltipListHeaderProps) {
  return (
    <p className="font-mono-tech px-2 pb-1.5 pt-1 text-[0.6rem] uppercase tracking-wider text-faint">
      {label} · {count}
    </p>
  );
}

interface TooltipListItemProps {
  children: ReactNode;
  highlighted?: boolean;
  className?: string;
}

export function TooltipListItem({
  children,
  highlighted = false,
  className = "",
}: TooltipListItemProps) {
  return (
    <li
      className={`rounded-[var(--radius-sm)] px-2 py-1.5 ${
        highlighted ? "bg-accent/8 ring-1 ring-inset ring-accent/15" : ""
      } ${className}`}
    >
      {children}
    </li>
  );
}
