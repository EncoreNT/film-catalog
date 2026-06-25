"use client";

import { useId, useState, type ReactNode } from "react";
import { getResolutionLabel } from "@/lib/resolution";
import {
  RESOLUTION_REFERENCE_PX,
  RESOLUTIONS,
  type DictOption,
} from "@/lib/dictionaries";
import { Select } from "./Select";
import { InfoHint } from "./InfoHint";

type BitrateUnit = "kbps" | "Mbps";

interface BitrateInputProps {
  label: string;
  valueKbps: number | null;
  onChange: (kbps: number | null) => void;
  hint?: ReactNode;
}

function kbpsToDisplay(kbps: number | null, unit: BitrateUnit): string {
  if (kbps == null) return "";
  if (unit === "Mbps") {
    const mbps = kbps / 1000;
    return Number.isInteger(mbps) ? String(mbps) : mbps.toFixed(2).replace(/\.?0+$/, "");
  }
  return String(kbps);
}

function displayToKbps(raw: string, unit: BitrateUnit): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const num = parseFloat(trimmed.replace(",", "."));
  if (Number.isNaN(num) || num < 0) return null;
  return unit === "Mbps" ? Math.round(num * 1000) : Math.round(num);
}

export function BitrateInput({
  label,
  valueKbps,
  onChange,
  hint,
}: BitrateInputProps) {
  const fieldId = useId();
  const [unit, setUnit] = useState<BitrateUnit>(
    valueKbps != null && valueKbps >= 10000 ? "Mbps" : "kbps",
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <label htmlFor={fieldId} className="text-sm text-muted">
          {label}
        </label>
        {hint ? <InfoHint text={hint} label={label} /> : null}
      </div>
      <div
        className="flex min-h-11 overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated"
        role="group"
        aria-label={label}
      >
        <input
          id={fieldId}
          type="text"
          inputMode="decimal"
          value={kbpsToDisplay(valueKbps, unit)}
          onChange={(e) => onChange(displayToKbps(e.target.value, unit))}
          placeholder={unit === "Mbps" ? "35" : "35000"}
          className="focus-ring min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm text-text placeholder:text-muted/60"
        />
        <div className="flex shrink-0 border-l border-border">
          {(["kbps", "Mbps"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`focus-ring min-h-11 cursor-pointer px-3 text-xs font-medium transition-colors ${
                unit === u
                  ? "bg-accent/15 text-accent"
                  : "text-muted hover:text-text"
              }`}
              aria-pressed={unit === u}
            >
              {u}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface SizeInputProps {
  width: number | null;
  height: number | null;
  resolutionLabel: string;
  onWidthChange: (v: number | null) => void;
  onHeightChange: (v: number | null) => void;
  onResolutionLabelChange: (v: string) => void;
  resolutionOptions?: DictOption[];
}

export function SizeInput({
  width,
  height,
  resolutionLabel,
  onWidthChange,
  onHeightChange,
  onResolutionLabelChange,
  resolutionOptions = RESOLUTIONS,
}: SizeInputProps) {
  const groupId = useId();

  const handleWidth = (raw: string) => {
    const v = raw.trim() ? parseInt(raw, 10) : null;
    const w = v != null && !Number.isNaN(v) ? v : null;
    onWidthChange(w);
    if (w != null && height != null) {
      onResolutionLabelChange(getResolutionLabel(w, height));
    }
  };

  const handleHeight = (raw: string) => {
    const v = raw.trim() ? parseInt(raw, 10) : null;
    const h = v != null && !Number.isNaN(v) ? v : null;
    onHeightChange(h);
    if (width != null && h != null) {
      onResolutionLabelChange(getResolutionLabel(width, h));
    }
  };

  const handleLabelChange = (label: string) => {
    onResolutionLabelChange(label);
    const ref = RESOLUTION_REFERENCE_PX[label];
    if (ref) {
      onWidthChange(ref.width);
      onHeightChange(ref.height);
    }
  };

  return (
    <div className="space-y-4">
      <Select
        label="Разрешение (категория)"
        value={resolutionLabel}
        onChange={handleLabelChange}
        options={[{ value: "", label: "—" }, ...resolutionOptions]}
        preserveOrder
        hint="Категория разрешения (4K, 1080p, 720p…). При выборе подставятся эталонные размеры в пикселях."
      />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-muted">Размер в пикселях</span>
          <InfoHint
            label="Размер в пикселях"
            text="Категория разрешения (4K, 1080p…) определяется автоматически из ширины и высоты."
          />
        </div>
        <div
          className="flex min-h-11 items-center gap-2"
          role="group"
          aria-labelledby={groupId}
        >
          <span id={groupId} className="sr-only">
            Ширина и высота в пикселях
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={width != null ? String(width) : ""}
            onChange={(e) => handleWidth(e.target.value)}
            placeholder="3840"
            aria-label="Ширина в пикселях"
            className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
          />
          <span className="font-mono-tech shrink-0 text-faint" aria-hidden>
            ×
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={height != null ? String(height) : ""}
            onChange={(e) => handleHeight(e.target.value)}
            placeholder="2160"
            aria-label="Высота в пикселях"
            className="focus-ring min-h-11 w-full rounded-[var(--radius)] border border-border bg-bg-elevated px-3 py-2 text-sm text-text placeholder:text-muted/60"
          />
          <span className="font-mono-tech shrink-0 text-xs text-muted">px</span>
        </div>
        {width != null && height != null ? (
          <p className="text-xs text-muted">
            Категория:{" "}
            <span className="text-accent">{getResolutionLabel(width, height)}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
