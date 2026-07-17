"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";

export interface BuildAcknowledgedWarning {
  code: string;
  message: string;
  severity: string;
}

interface BuildJobAcknowledgedWarningsProps {
  warnings: BuildAcknowledgedWarning[];
  defaultOpen?: boolean;
}

export function BuildJobAcknowledgedWarnings({
  warnings,
  defaultOpen = true,
}: BuildJobAcknowledgedWarningsProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (warnings.length === 0) {
    return null;
  }

  const countLabel = pluralWarnings(warnings.length);

  return (
    <aside
      className="relative overflow-hidden rounded-[var(--radius)] border border-ember/28 bg-bg-elevated/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
    >
      <div
        className="absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-ember-bright/90 via-ember/70 to-ember/35"
        aria-hidden
      />

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="build-ack-warnings-panel"
        className="focus-ring flex w-full items-center gap-3 p-4 pl-5 text-left transition-colors hover:bg-ember/[0.03] sm:gap-4 sm:p-5 sm:pl-6"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-ember/35 bg-ember/[0.1] text-ember-bright">
          <AlertTriangle className="h-4 w-4" strokeWidth={1.5} aria-hidden />
        </span>

        <span className="min-w-0 flex-1">
          <span className="font-mono-tech block text-[10px] uppercase tracking-[0.14em] text-ember-bright">
            {countLabel}
          </span>
          <span className="mt-0.5 block text-sm font-medium text-text">
            Подтверждено при постановке
          </span>
          {!open ? (
            <span className="mt-0.5 block truncate text-xs text-muted">
              {warnings[0]?.message}
              {warnings.length > 1 ? ` и ещё ${warnings.length - 1}` : ""}
            </span>
          ) : null}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            open ? "" : "-rotate-90"
          }`}
          strokeWidth={1.5}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id="build-ack-warnings-panel"
          role="region"
          aria-label="Список подтверждённых предупреждений"
          className="space-y-3 border-t border-ember/15 px-4 pb-4 pl-5 sm:px-5 sm:pb-5 sm:pl-6"
        >
          <p className="pt-3 text-xs leading-relaxed text-muted">
            Эти риски были приняты перед запуском сборки
          </p>

          <ul className="space-y-2">
            {warnings.map((item) => (
              <li
                key={`${item.code}:${item.message}`}
                className="rounded-[var(--radius-sm)] border border-ember/20 bg-ember/[0.05] px-3 py-2.5 text-sm leading-relaxed text-text/90"
              >
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

function pluralWarnings(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${n} предупреждение`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${n} предупреждения`;
  }
  return `${n} предупреждений`;
}
