import Link from "next/link";
import type { ReactNode } from "react";

export function ReleaseMenuItem({
  label,
  icon,
  href,
  onClick,
  disabled,
  disabledHint,
  danger,
}: {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  disabledHint?: string | null;
  danger?: boolean;
}) {
  const tooltip = disabled && disabledHint ? disabledHint : label;
  const className = `focus-ring font-mono-tech flex w-full items-start gap-2 px-3 py-2 text-left text-[11px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
    danger
      ? "text-muted hover:bg-red-500/10 hover:text-red-300"
      : "text-muted hover:bg-accent/10 hover:text-accent"
  }`;

  const content = (
    <>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span className="min-w-0 flex flex-col gap-0.5">
        <span className="whitespace-nowrap">{label}</span>
        {disabled && disabledHint ? (
          <span className="font-sans text-[10px] font-normal normal-case leading-snug text-faint">
            {disabledHint}
          </span>
        ) : null}
      </span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={className} title={tooltip} role="menuitem">
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
      role="menuitem"
    >
      {content}
    </button>
  );
}
