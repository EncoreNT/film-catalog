import type { ReactNode } from "react";
import { Sun, Waves } from "lucide-react";
import type { ReleaseDetailView } from "@/lib/releases/release-detail-view";

/* The premium-spec showcase for a release: three large machined
   "instrument plaques" (resolution / dynamic range / object audio)
   replacing the old small chip ribbon. Each plaque is a double-bezel
   glass plate sitting in an aluminum tray, with its own signature
   effect so the trio reads as distinct instruments, not three
   identical chips:

   - Resolution:       accent scales with the pixel tier — 4K is amplified
     with the full warm gold glow + a backlit halo + anamorphic lens flare
     + holo foil, 1080p a calm muted-gold readout, 720p and below a clean
     neutral. The plaque carries the long-form label ("4K Ultra HD",
     "1080p Full HD" ...).
     The Gold/Ruby release tier is NOT shown here: it belongs to the
     release tab, not the resolution.
   - Dolby Vision:     iridescent holo-foil + neural-violet glow (DV's
     premium color identity). HDR10 / HDR10+ fall back to gold + a
     warm holo.
   - Atmos:            deep-crimson holo-ruby + crimson glow, the jewel
     of the trio, matching the catalog's ruby tier.

   Hover plays the project's sheen sweep + animated gradient border;
   the staggered entrance replays on every release tab switch because
   the parent panel remounts with key=release.id, so the cascade
   re-runs each switch. Reduced motion is handled globally. */

type PlaqueAccent = "gold" | "neural" | "crimson" | "muted" | "neutral";
type HoloKind = "foil" | "gold" | "ruby";
type PlaqueIndex = 1 | 2 | 3;

const ACCENT_HOTSPOT: Record<PlaqueAccent, string> = {
  gold: "bg-accent/20",
  neural: "bg-neural/22",
  crimson: "bg-crimson/22",
  muted: "bg-accent/10",
  neutral: "",
};

const ACCENT_DOT: Record<PlaqueAccent, string> = {
  gold: "bg-accent glow-accent-10",
  neural: "bg-neural glow-neural-10",
  crimson: "bg-crimson glow-crimson-12",
  muted: "bg-accent/60",
  neutral: "bg-muted",
};

const HOLO_CLASS: Record<HoloKind, string> = {
  foil: "holo-foil",
  gold: "holo-gold",
  ruby: "holo-ruby",
};

const ICON_CIRCLE: Record<"gold" | "neural" | "crimson", string> = {
  gold: "border-accent/30 bg-accent/10 text-accent-bright glow-accent-12",
  neural: "border-neural/30 bg-neural/10 text-neural-bright glow-neural-12",
  crimson: "border-crimson/30 bg-crimson/10 text-crimson-bright glow-crimson-16",
};

interface PlaqueShellProps {
  index: PlaqueIndex;
  accent: PlaqueAccent;
  holo?: HoloKind;
  lensFlare?: boolean;
  children: ReactNode;
}

function PlaqueShell({
  index,
  accent,
  holo,
  lensFlare,
  children,
}: PlaqueShellProps) {
  return (
    <div
      className={`spec-plaque-in spec-plaque-in--${index} group/laser relative h-full`}
    >
      <div
        className={`glow-hotspot pointer-events-none absolute -inset-4 -z-10 ${ACCENT_HOTSPOT[accent]}`}
        aria-hidden
      />
      <div className="gradient-border-cinematic relative h-full rounded-[16px] border border-border-strong bg-bg-elevated/50 p-1.5 transition-[border-color,box-shadow] duration-500 group-hover/laser:border-accent/30">
        <div className="spec-plaque-core relative h-full overflow-hidden rounded-[calc(16px-0.375rem)] px-3.5 py-3 sm:px-4 sm:py-3.5">
          {holo ? (
            <div
              className={`pointer-events-none absolute inset-0 opacity-[0.18] ${HOLO_CLASS[holo]}`}
              aria-hidden
            />
          ) : null}
          {lensFlare ? (
            <div
              className="lens-flare"
              style={{ top: "30%", left: "4%", width: "56%" }}
              aria-hidden
            />
          ) : null}
          <div className="sheen-layer" aria-hidden />
          <div className="relative flex h-full flex-col gap-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PlaqueEyebrow({ accent, label }: { accent: PlaqueAccent; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${ACCENT_DOT[accent]}`}
        aria-hidden
      />
      <span className="font-mono-tech text-faint">{label}</span>
    </div>
  );
}

/** Resolution accent scales with the pixel tier so a 720p readout does
    not glow like a 4K one: 4K → full gold (amplified), 1080p → muted gold,
    anything lower (720p / SD / unknown) → neutral with no glow. */
function resolutionAccent(resolution: string): PlaqueAccent {
  switch (resolution.toLowerCase()) {
    case "4k":
      return "gold";
    case "1080p":
      return "muted";
    default:
      return "neutral";
  }
}

/** Long-form resolution readout for the hero plaque: "4K" pairs with
    "Ultra HD", 1080p with "Full HD", 720p with "HD". Falls back to the
    raw label with no suffix. */
function formatResolutionLong(resolution: string): {
  main: string;
  suffix: string | null;
} {
  switch (resolution.toLowerCase()) {
    case "4k":
      return { main: "4K", suffix: "Ultra HD" };
    case "1080p":
      return { main: "1080p", suffix: "Full HD" };
    case "720p":
      return { main: "720p", suffix: "HD" };
    case "576p":
      return { main: "576p", suffix: "SD" };
    case "480p":
      return { main: "480p", suffix: "SD" };
    default:
      return { main: resolution, suffix: null };
  }
}

function ResolutionPlaque({
  release,
  index,
}: {
  release: ReleaseDetailView;
  index: PlaqueIndex;
}) {
  const accent = resolutionAccent(release.video.resolution);
  const { main, suffix } = formatResolutionLong(release.video.resolution);

  // 4K is the hero of the console. Rather than dimming the lower tiers, 4K
  // is amplified: a larger, heavier numeral in the brightest gold, the
  // strongest drop-glow, and a blurred gold halo behind it for a backlit
  // bloom — on top of the holo foil and anamorphic flare. 1080p keeps a
  // calm, fully legible muted-gold readout (not dimmed into "disabled");
  // 720p / SD drops to a plain neutral. The pixel tier reads at a glance.
  const sizeClass =
    accent === "gold" ? "text-4xl sm:text-5xl" : "text-3xl sm:text-4xl";
  const weightClass = accent === "gold" ? "font-bold" : "font-semibold";
  const numeralClass =
    accent === "gold"
      ? "text-accent-bright drop-glow-accent-xl"
      : accent === "muted"
        ? "text-accent/80"
        : "text-muted";
  const suffixSizeClass = accent === "neutral" ? "text-xs" : "text-sm";
  const suffixClass =
    accent === "gold"
      ? "text-accent/80"
      : accent === "muted"
        ? "text-accent/60"
        : "text-faint";

  return (
    <PlaqueShell
      index={index}
      accent={accent}
      holo={accent === "gold" ? "gold" : undefined}
      lensFlare={accent === "gold"}
    >
      <PlaqueEyebrow accent={accent} label="разрешение" />
      <div className="relative mt-1 flex items-baseline gap-2">
        {accent === "gold" ? (
          <span
            aria-hidden
            className="pointer-events-none absolute -left-2 top-1/2 h-24 w-32 -translate-y-1/2 rounded-full bg-accent/30 blur-2xl"
          />
        ) : null}
        <span
          className={`relative font-mono ${sizeClass} ${weightClass} leading-none tracking-tight ${numeralClass}`}
        >
          {main}
        </span>
      </div>
      {suffix ? (
        <span className={`font-mono-tech ${suffixSizeClass} ${suffixClass}`}>
          {suffix}
        </span>
      ) : null}
      <div className="mt-auto pt-1">
        <span className="font-mono text-xs tabular-nums text-faint">
          {release.vPixels ?? "—"}
        </span>
      </div>
    </PlaqueShell>
  );
}

function HdrPlaque({
  release,
  index,
}: {
  release: ReleaseDetailView;
  index: PlaqueIndex;
}) {
  const hdr = release.premiumHdr;
  if (!hdr) return null;

  const isDv = hdr.isDolbyVision;
  const accent: "neural" | "gold" = isDv ? "neural" : "gold";
  const holo: HoloKind = isDv ? "foil" : "gold";

  const [mainPart, ...rest] = hdr.label.split(" \u00b7 ");
  const main = mainPart ?? hdr.label;
  const profileSub = rest.length > 0 ? rest.join(" \u00b7 ") : null;
  const sub =
    profileSub ?? (hdr.label === "HDR10+" ? "Dynamic Metadata" : "High Dynamic Range");

  return (
    <PlaqueShell index={index} accent={accent} holo={holo}>
      <PlaqueEyebrow accent={accent} label="динамический диапазон" />
      <div className="mt-1 flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${ICON_CIRCLE[accent]}`}
          aria-hidden
        >
          <Sun className="h-4 w-4" />
        </span>
        <span
          className={`font-mono text-base font-semibold leading-none sm:text-lg ${
            accent === "neural"
              ? "text-neural-bright drop-glow-neural"
              : "text-accent-bright drop-glow-accent"
          }`}
        >
          {main}
        </span>
      </div>
      <span className="font-mono-tech mt-auto pt-1 text-faint">{sub}</span>
    </PlaqueShell>
  );
}

function AtmosPlaque({
  release,
  index,
}: {
  release: ReleaseDetailView;
  index: PlaqueIndex;
}) {
  const atmos = release.premiumAtmos;
  if (!atmos) return null;

  return (
    <PlaqueShell index={index} accent="crimson" holo="ruby">
      <PlaqueEyebrow accent="crimson" label="объёмный звук" />
      <div className="mt-1 flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${ICON_CIRCLE.crimson}`}
          aria-hidden
        >
          <Waves className="h-4 w-4" />
        </span>
        <span className="font-mono text-lg font-semibold leading-none text-crimson-bright drop-glow-crimson sm:text-xl">
          ATMOS
        </span>
      </div>
      <div className="mt-auto flex flex-col gap-0.5 pt-1">
        <span className="font-mono text-sm tabular-nums text-muted">
          {atmos.sublabel}
        </span>
        <span className="font-mono-tech text-faint">{atmos.label}</span>
      </div>
    </PlaqueShell>
  );
}

export function ReleaseSpecHero({ release }: { release: ReleaseDetailView }) {
  const hasResolution =
    !!release.video.resolution && release.video.resolution !== "—";

  const items: { key: string; node: ReactNode }[] = [];
  if (hasResolution) {
    items.push({ key: "res", node: <ResolutionPlaque release={release} index={1} /> });
  }
  if (release.premiumHdr) {
    const idx = (items.length + 1) as PlaqueIndex;
    items.push({ key: "hdr", node: <HdrPlaque release={release} index={idx} /> });
  }
  if (release.premiumAtmos) {
    const idx = (items.length + 1) as PlaqueIndex;
    items.push({ key: "atmos", node: <AtmosPlaque release={release} index={idx} /> });
  }

  if (items.length === 0) return null;

  const gridClass =
    items.length === 1
      ? "grid grid-cols-1 gap-3"
      : items.length === 2
        ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
        : "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={gridClass}>
      {items.map((item, i) => {
        // With three plaques, let the third (Atmos) span the full sm row
        // so it never lands as a half-width orphan under the first two;
        // on xl it returns to a single column of the 3-up row.
        const wrap =
          items.length === 3 && i === 2 ? "sm:col-span-2 xl:col-span-1" : undefined;
        return (
          <div key={item.key} className={wrap}>
            {item.node}
          </div>
        );
      })}
    </div>
  );
}
