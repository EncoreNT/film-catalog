import { type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-bg-deep hover:bg-accent-bright shadow-[0_0_24px_var(--accent-glow)] hover:shadow-[0_0_36px_var(--accent-glow)]",
  secondary:
    "border border-border-strong bg-bg-surface text-text hover:border-accent/50 hover:text-accent hover:bg-bg-surface-hover",
  ghost: "text-muted hover:text-text hover:bg-bg-surface",
  danger:
    "border border-danger/30 bg-danger/10 text-danger hover:bg-danger/20",
};

export function Button({
  variant = "secondary",
  loading,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`focus-ring inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius)] px-4 py-2 text-sm font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
