import { useId, type ReactNode } from "react";
import type { ReleaseTier } from "@/lib/media/spec-tags";
import { tierLaserTopClass } from "@/lib/media/tier-presentation";

type LaserShape = "portrait" | "landscape";

interface LaserCardFrameProps {
  children: ReactNode;
  tier?: ReleaseTier;
  className?: string;
  /** Portrait for movie posters; landscape for horizontal build rows. */
  shape?: LaserShape;
}

const LASER_SHAPE: Record<
  LaserShape,
  { viewBox: string; width: number; height: number; rx: number }
> = {
  portrait: { viewBox: "0 0 100 150", width: 98.4, height: 148.4, rx: 5 },
  landscape: { viewBox: "0 0 100 36", width: 98.4, height: 34.4, rx: 5 },
};

/**
 * Hi-tech card shell with tier animations on hover.
 *
 * Portrait (posters): SVG perimeter laser trace + sheen.
 * Landscape (build rows): tier-laser-top at rest + horizontal scan sweep on hover —
 * SVG perimeter dash animation stretches on wide cards and reads as broken ticks.
 */
export function LaserCardFrame({
  children,
  tier = null,
  className = "",
  shape = "portrait",
}: LaserCardFrameProps) {
  const uid = useId().replace(/:/g, "");
  const goldHeadId = `laser-head-${uid}`;
  const emberId = `laser-ember-${uid}`;
  const rubyHeadId = `laser-ruby-${uid}`;
  const standardHeadId = `laser-standard-${uid}`;
  const glowId = `laser-glow-${uid}`;
  const frame = LASER_SHAPE[shape];

  const strokeId =
    tier === "ruby"
      ? rubyHeadId
      : tier === "gold"
        ? emberId
        : standardHeadId;

  if (shape === "landscape") {
    const laserTopTone =
      tier === "ruby" || tier === "gold" ? tierLaserTopClass(tier) : null;
    const sweepTone =
      tier === "ruby"
        ? "laser-row-sweep-ruby"
        : tier === "gold"
          ? "laser-row-sweep-gold"
          : "laser-row-sweep-standard";

    return (
      <div className={`group/laser relative rounded-[var(--radius)] ${className}`}>
        {laserTopTone ? (
          <span className={`tier-laser-top ${laserTopTone}`} aria-hidden />
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[var(--radius)]">
          <span className={`laser-row-sweep motion-reduce:hidden ${sweepTone}`} aria-hidden />
        </div>

        <div
          className="sheen-layer pointer-events-none absolute inset-0 z-[25] overflow-hidden rounded-[var(--radius)]"
          aria-hidden
        />

        {children}
      </div>
    );
  }

  return (
    <div className={`group/laser relative rounded-[var(--radius)] ${className}`}>
      {/* Laser trace — SVG only on hover (no rest-state artifact) */}
      <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[var(--radius)]">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={frame.viewBox}
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
            width={frame.width}
            height={frame.height}
            rx={frame.rx}
            ry={frame.rx}
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
              width={frame.width}
              height={frame.height}
              rx={frame.rx}
              ry={frame.rx}
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
