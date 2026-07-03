import type { ReactNode } from "react";

export interface EmptyStateProps {
  glowVariant: "accent" | "ember";
  icon: ReactNode;
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  action: ReactNode;
  footer?: ReactNode;
}

const glowStyles = {
  accent: {
    gradient: "radial-gradient(ellipse 60% 50% at 50% 0%, var(--accent-glow) 0%, transparent 70%)",
    iconBorder: "from-accent-soft to-transparent",
    iconShadow: "shadow-[0_0_40px_var(--accent-glow)]",
    iconColor: "text-accent",
    eyebrowColor: "text-accent",
  },
  ember: {
    gradient: "radial-gradient(ellipse 60% 50% at 50% 0%, var(--ember-glow) 0%, transparent 70%)",
    iconBorder: "from-ember/10 to-transparent",
    iconShadow: "shadow-[0_0_40px_var(--ember-glow)]",
    iconColor: "text-ember",
    eyebrowColor: "text-ember",
  },
} as const;

export function EmptyState({
  glowVariant,
  icon,
  eyebrow,
  title,
  description,
  action,
  footer,
}: EmptyStateProps) {
  const glow = glowStyles[glowVariant];

  return (
    <section className="relative mt-12">
      <div
        className="film-perfs h-4 w-full opacity-60"
        aria-hidden
        style={glowVariant === "accent" ? { color: "var(--bg-base)" } : undefined}
      />

      <div className="relative overflow-hidden rounded-[var(--radius)] border border-border-strong bg-gradient-to-b from-bg-surface to-transparent">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden
          style={{ background: glow.gradient }}
        />

        <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center sm:py-28">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br ${glow.iconBorder} ${glow.iconShadow}`}
          >
            <span className={glow.iconColor} aria-hidden>
              {icon}
            </span>
          </div>

          <div className="space-y-3">
            <p className={`font-mono-tech ${glow.eyebrowColor}`}>{eyebrow}</p>
            <h2 className="font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              {title}
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-muted">
              {description}
            </p>
          </div>

          {action}

          {footer ? <div className="mt-4">{footer}</div> : null}
        </div>
      </div>

      <div className="film-perfs mt-px h-4 w-full opacity-60" aria-hidden />
    </section>
  );
}
