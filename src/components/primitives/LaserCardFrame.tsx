import { useId, type ReactNode } from "react";
import type { ReleaseTier } from "@/lib/media/spec-tags";

interface LaserCardFrameProps {
  children: ReactNode;
  tier?: ReleaseTier;
  className?: string;
}

/**
 * Hi-tech card shell with a laser perimeter that animates on hover
 * (SVG trace + sheen). Corner edges follow --radius so cards share the
 * rounded shape language of the rest of the UI. Rest state avoids any
 * floating outer border (-inset-px rings leak a straight segment past the
 * rounded corners = the "sticks" artifact), so the tier signal at rest
 * comes from the poster's inset ring + the article's tier-colored outer
 * glow (see MovieCard). Only the hover-only SVG laser trace + sheen live
 * here, clipped to the rounded shape via overflow-hidden.
 */
export function LaserCardFrame({
  children,
  tier = null,
  className = "",
}: LaserCardFrameProps) {
  const uid = useId().replace(/:/g, "");
  const goldHeadId = `laser-head-${uid}`;
  const emberId = `laser-ember-${uid}`;
  const rubyHeadId = `laser-ruby-${uid}`;
  const standardHeadId = `laser-standard-${uid}`;
  const glowId = `laser-glow-${uid}`;

  const strokeId =
    tier === "ruby"
      ? rubyHeadId
      : tier === "gold"
        ? emberId
        : standardHeadId;

  return (
    <div className={`group/laser relative rounded-[var(--radius)] ${className}`}>
      {/* Laser trace — SVG only on hover (no rest-state artifact) */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[var(--radius)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 150"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id={goldHeadId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="var(--accent-bright)" />
              <stop offset="55%" stopColor="#fff8e8" />
              <stop offset="70%" stopColor="var(--accent)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient id={emberId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="45%" stopColor="var(--ember)" />
              <stop offset="65%" stopColor="var(--accent-bright)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient
              id={rubyHeadId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="var(--crimson)" />
              <stop offset="55%" stopColor="#f6e2e6" />
              <stop offset="70%" stopColor="var(--crimson-bright)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <linearGradient
              id={standardHeadId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="transparent" />
              <stop offset="40%" stopColor="#c8d4e8" />
              <stop offset="55%" stopColor="#f4f6fb" />
              <stop offset="70%" stopColor="#dee4f0" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
            <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <rect
            x="0.8"
            y="0.8"
            width="98.4"
            height="148.4"
            rx="5"
            ry="5"
            fill="none"
            stroke={`url(#${strokeId})`}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
            pathLength="1"
            className="laser-trace"
            filter={`url(#${glowId})`}
          />
          {tier !== null ? (
            <rect
              x="0.8"
              y="0.8"
              width="98.4"
              height="148.4"
              rx="5"
              ry="5"
              fill="none"
              stroke={`url(#${goldHeadId})`}
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              pathLength="1"
              className="laser-trace laser-trace--delayed"
              filter={`url(#${glowId})`}
              opacity="0.5"
            />
          ) : null}
        </svg>
      </div>

      {/* Sheen sweep — diagonal light pass on hover */}
      <div
        className="sheen-layer pointer-events-none absolute inset-0 z-[25] overflow-hidden rounded-[var(--radius)]"
        aria-hidden
      />

      {children}
    </div>
  );
}
