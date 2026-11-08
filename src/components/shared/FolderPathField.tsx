"use client";

import { useId, useState } from "react";
import { FolderOpen } from "lucide-react";
import { NativePathPickerButton } from "./NativePathPickerButton";
import { Field, UnderlineLines } from "@/components/primitives/Field";
import {
  commitFilePathInput,
  FILE_PATH_INPUT_HINT,
} from "@/lib/shared/display-path";

type FolderPathFieldLayout = "field" | "toolbar";

interface FolderPathFieldProps {
  label: string;
  value: string;
  onChange: (runtimePath: string, displayPath: string) => void;
  disabled?: boolean;
  hint?: string;
  id?: string;
  /** "toolbar" — одна строка в surface-card (страница сканирования). */
  layout?: FolderPathFieldLayout;
}

export function FolderPathField({
  label,
  value,
  onChange,
  disabled = false,
  hint = FILE_PATH_INPUT_HINT,
  id,
  layout = "field",
}: FolderPathFieldProps) {
  const fallbackId = useId();
  const fieldId = id ?? fallbackId;
  const [input, setInput] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (value !== previousValue) {
    setPreviousValue(value);
    setInput(value);
  }

  const commitInput = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      onChange("", "");
      return;
    }
    const { runtime, display } = commitFilePathInput(trimmed);
    setInput(display);
    onChange(runtime, display);
  };

  const browseButton = (
    <NativePathPickerButton
      kind="directory"
      onPick={(runtime, display) => {
        setInput(display);
        onChange(runtime, display);
      }}
      onError={setError}
      onPickingChange={setPicking}
      disabled={disabled}
      textClassName={
        layout === "toolbar" ? "hidden md:inline" : "hidden sm:inline"
      }
      className={
        layout === "toolbar"
          ? "!min-h-9 shrink-0 gap-1.5 !rounded-l-none !rounded-r-[var(--radius-sm)] !border-0 !border-l !border-border !px-2.5 font-mono-tech text-[11px] uppercase tracking-[0.14em] text-muted hover:bg-bg-surface hover:text-accent"
          : "!min-h-11 shrink-0 gap-1.5 !px-2 font-mono-tech text-[11px] uppercase tracking-[0.14em] text-muted hover:text-accent"
      }
    />
  );

  if (layout === "toolbar") {
    return (
      <div className="min-w-0 space-y-1">
        <label htmlFor={fieldId} className="relative flex min-w-0">
          <span className="sr-only">{label}</span>
          <FolderOpen
            className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-accent/70"
            aria-hidden
          />
          <input
            id={fieldId}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => commitInput(input)}
            placeholder="D:\Movies или /mnt/d/Movies"
            title={hint}
            spellCheck={false}
            autoComplete="off"
            disabled={disabled || picking}
            aria-invalid={!!error}
            className="focus-ring min-h-9 min-w-0 flex-1 rounded-l-[var(--radius-sm)] rounded-r-none border border-border border-r-0 bg-bg-elevated/80 py-2 pl-10 pr-3 font-mono text-sm text-text placeholder:font-sans placeholder:text-faint"
          />
          {browseButton}
        </label>
        {error ? (
          <p className="px-1 text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Field
      id={fieldId}
      label={label}
      variant="underline"
      hint={hint}
      error={error ?? undefined}
    >
      <div className="flex items-end gap-2 sm:gap-3">
        <div className="relative min-w-0 flex-1">
          <input
            id={fieldId}
            className="peer min-h-11 w-full border-0 bg-transparent px-0 py-2 font-mono-tech text-sm normal-case text-text placeholder:text-muted/50 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onBlur={() => commitInput(input)}
            placeholder="D:\TV\Movies или /mnt/d/TV/Movies"
            spellCheck={false}
            autoComplete="off"
            disabled={disabled || picking}
            aria-invalid={!!error}
          />
          <UnderlineLines error={error ?? undefined} />
        </div>
        {browseButton}
      </div>
    </Field>
  );
}
