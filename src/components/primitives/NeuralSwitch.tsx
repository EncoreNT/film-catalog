"use client";

interface NeuralSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  ariaLabel?: string;
}

/** Compact neural-violet toggle — future/unreleased slot affordance. */
export function NeuralSwitch({
  checked,
  onChange,
  label,
  ariaLabel,
}: NeuralSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? label}
      onClick={() => onChange(!checked)}
      className={`focus-ring inline-flex cursor-pointer items-center gap-2 rounded-full border px-2 py-1 transition-[color,background-color,border-color,box-shadow] duration-200 ${
        checked
          ? "border-neural/40 bg-neural/[0.08] shadow-[0_0_14px_rgba(139,92,246,0.18)]"
          : "border-transparent bg-transparent shadow-none"
      }`}
    >
      <span
        aria-hidden
        className={`relative h-4 w-7 shrink-0 rounded-full border transition-[color,background-color,border-color,box-shadow] duration-200 ${
          checked
            ? "border-neural/45 bg-neural/25 shadow-[0_0_8px_rgba(139,92,246,0.22)]"
            : "border-border-strong bg-bg-elevated"
        }`}
      >
        <span
          className={`absolute top-px left-px h-3.5 w-3.5 rounded-full border transition-[transform,background-color,border-color,box-shadow] duration-200 ${
            checked
              ? "translate-x-3 border-neural/50 bg-neural-bright shadow-[0_0_6px_rgba(139,92,246,0.45)]"
              : "translate-x-0 border-border-strong/70 bg-faint/90"
          }`}
        />
      </span>
      <span
        className={`font-mono-tech text-[0.58rem] uppercase tracking-[0.14em] transition-colors ${
          checked ? "text-neural-bright/90" : "text-faint"
        }`}
      >
        {label}
      </span>
    </button>
  );
}
