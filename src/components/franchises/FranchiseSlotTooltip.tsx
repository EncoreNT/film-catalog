import {
  AudioLines,
  Calendar,
  Clock,
  Contrast,
  Disc3,
  Film,
  Monitor,
  Star,
} from "lucide-react";
import type { FranchiseSlotSummary, SlotTier } from "@/lib/franchises/franchise-summary";
import { slotQualityLabel } from "@/lib/franchises/franchise-summary";

const TIER_BADGE: Record<SlotTier, { label: string; className: string } | null> =
  {
    missing: null,
    basic: {
      label: "стандарт",
      className: "border-border-strong bg-bg-surface text-muted",
    },
    "premium-1": {
      label: "премиум · 1/3",
      className: "border-accent/35 bg-accent/10 text-accent",
    },
    "premium-2": {
      label: "премиум · 2/3",
      className: "border-accent/45 bg-accent/12 text-accent-bright",
    },
    elite: {
      label: "элита",
      className:
        "border-accent/55 bg-accent/15 text-accent-bright shadow-[0_0_10px_var(--accent-glow)]",
    },
  };

function MetaItem({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="text-accent/70">{icon}</span>
      {children}
    </span>
  );
}

function SpecRow({
  label,
  value,
  note,
}: {
  label: string;
  value: string | null;
  note?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className="font-mono-tech shrink-0 text-faint">{label}</span>
      <span className="text-right text-text">
        {value}
        {note ? (
          <span className="font-mono-tech ml-1.5 text-faint">{note}</span>
        ) : null}
      </span>
    </div>
  );
}

interface FranchiseSlotTooltipProps {
  slot: FranchiseSlotSummary;
}

export function FranchiseSlotTooltip({ slot }: FranchiseSlotTooltipProps) {
  const tierBadge = TIER_BADGE[slot.tier];
  const position = `Фильм ${slot.index + 1}`;

  if (!slot.filled) {
    const hintTitle = slot.titleHint?.trim() || null;
    const hintYear = slot.yearHint ?? null;
    return (
      <div className="w-[min(18rem,calc(100vw-2rem))] space-y-3 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono-tech text-[0.65rem] uppercase tracking-wider text-accent">
              {position}
            </p>
            <p className="font-display mt-1 text-base font-semibold text-text">
              Не добавлен
            </p>
          </div>
          <Film className="h-4 w-4 shrink-0 text-ember/60" aria-hidden />
        </div>
        {hintTitle || hintYear ? (
          <div className="rounded-[var(--radius-sm)] border border-ember/25 bg-ember/[0.06] px-3 py-2">
            <p className="font-mono-tech text-[0.6rem] uppercase tracking-wider text-ember/80">
              ожидается
            </p>
            {hintTitle ? (
              <p className="mt-1 text-sm text-text">{hintTitle}</p>
            ) : null}
            {hintYear ? (
              <p className="font-mono-tech mt-0.5 text-xs text-muted">
                {hintYear}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Слот свободен — фильм ещё не привязан к франшизе.
          </p>
        )}
      </div>
    );
  }

  const specs = slotQualityLabel(slot);

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] space-y-3 p-3.5">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-mono-tech text-[0.65rem] uppercase tracking-wider text-accent">
            {position}
          </p>
          {tierBadge ? (
            <span
              className={`font-mono-tech rounded-full border px-2 py-0.5 text-[0.55rem] uppercase tracking-wider ${tierBadge.className}`}
            >
              {tierBadge.label}
            </span>
          ) : null}
          {slot.versionLabel ? (
            <span className="font-mono-tech rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[0.55rem] text-accent-bright">
              {slot.versionLabel}
            </span>
          ) : null}
        </div>
        <p className="font-display text-base font-semibold leading-snug text-text">
          {slot.title ?? "Без названия"}
        </p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {slot.year ? (
            <MetaItem icon={<Calendar className="h-3 w-3" aria-hidden />}>
              {slot.year}
            </MetaItem>
          ) : null}
          {slot.durationLabel ? (
            <MetaItem icon={<Clock className="h-3 w-3" aria-hidden />}>
              {slot.durationLabel}
            </MetaItem>
          ) : null}
          {slot.rating != null ? (
            <MetaItem icon={<Star className="h-3 w-3 fill-accent text-accent" aria-hidden />}>
              {slot.rating}/10
            </MetaItem>
          ) : null}
        </div>
      </div>

      {slot.genreLabels.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {slot.genreLabels.map((genre) => (
            <span
              key={genre}
              className="font-mono-tech rounded-full border border-border-strong bg-bg-elevated px-2 py-0.5 text-[0.6rem] text-muted"
            >
              {genre}
            </span>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border/80 pt-2.5">
        <p className="font-mono-tech text-[0.6rem] uppercase tracking-wider text-faint">
          характеристики
        </p>
        <div className="space-y-1.5">
          <SpecRow
            label="видео"
            value={slot.resolution}
            note={slot.resolutionPixels}
          />
          <SpecRow label="hdr" value={slot.dynamicRange} />
          <SpecRow label="кодек" value={slot.videoCodec} />
          <SpecRow label="битрейт" value={slot.videoBitrate} />
          <SpecRow label="аудио" value={slot.audioFull ?? slot.audio} />
          <SpecRow label="релиз" value={slot.releaseTypeLabel} />
        </div>
        {specs !== "стандартное качество" ? (
          <p className="font-mono-tech text-[0.6rem] text-accent/80">{specs}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-3 border-t border-border/60 pt-2 text-[0.6rem] text-faint">
        <span className="inline-flex items-center gap-1">
          <Monitor className="h-3 w-3" aria-hidden />
          {slot.fourK ? "4K" : "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Contrast className="h-3 w-3" aria-hidden />
          {slot.hdr ? "HDR" : "SDR"}
        </span>
        <span className="inline-flex items-center gap-1">
          <AudioLines className="h-3 w-3" aria-hidden />
          {slot.atmos ? "Atmos" : "—"}
        </span>
        {slot.releaseTypeLabel ? (
          <span className="inline-flex items-center gap-1">
            <Disc3 className="h-3 w-3" aria-hidden />
            {slot.releaseTypeLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
