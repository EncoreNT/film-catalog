import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  titleClassName?: string;
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  titleClassName = "font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl",
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="font-mono-tech text-accent">{eyebrow}</p>
        ) : null}
        <h1 className={eyebrow ? `mt-2 ${titleClassName}` : titleClassName}>
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-sm text-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
