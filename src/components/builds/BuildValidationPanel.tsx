"use client";

import { AlertTriangle, Check, CircleAlert } from "lucide-react";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";

interface BuildWarning {
  code: string;
  message: string;
  severity: string;
}

interface BuildValidationPanelProps {
  validation: {
    ok: boolean;
    warnings: BuildWarning[];
    errors?: BuildWarning[];
    error?: string;
  };
  ackWarnings: boolean;
  onAckChange: (value: boolean) => void;
}

export function BuildValidationPanel({
  validation,
  ackWarnings,
  onAckChange,
}: BuildValidationPanelProps) {
  const errors = validation.errors ?? [];
  const warnings = validation.warnings ?? [];
  const hasErrors = !validation.ok;
  const hasWarnings = warnings.length > 0;

  const tone = hasErrors
    ? { dot: "bg-danger shadow-[0_0_8px_rgba(248,113,113,0.5)]", text: "text-danger", label: "ошибки" }
    : hasWarnings
      ? { dot: "bg-ember-bright shadow-[0_0_8px_var(--ember-glow)]", text: "text-ember-bright", label: "предупреждения" }
      : { dot: "bg-accent-bright shadow-[0_0_8px_var(--accent-glow)]", text: "text-accent-bright", label: "готово" };

  return (
    <MachinedCard variant="calm" bodyClassName="space-y-4">
      <CardSectionHeader label="проверка" title="Состояние сборки" />

      <div className="flex items-center gap-2.5">
        <span className={`neural-pulse h-2 w-2 rounded-full ${tone.dot}`} aria-hidden />
        <span className={`font-mono-tech text-xs uppercase tracking-[0.16em] ${tone.text}`}>
          {hasErrors
            ? `${errors.length} ${plural(errors.length, "ошибка", "ошибки", "ошибок")}`
            : hasWarnings
              ? `${warnings.length} ${plural(warnings.length, "предупреждение", "предупреждения", "предупреждений")}`
              : "готов к очереди"}
        </span>
      </div>

      {hasErrors ? (
        <div className="space-y-2">
          {validation.error ? (
            <p className="flex items-start gap-2 text-sm text-danger">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
              {validation.error}
            </p>
          ) : null}
          {errors.map((item) => (
            <p
              key={item.code}
              className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-danger/30 bg-danger/[0.06] px-2.5 py-2 text-xs text-danger"
            >
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {item.message}
            </p>
          ))}
        </div>
      ) : null}

      {!hasErrors && !hasWarnings ? (
        <p className="flex items-start gap-2 text-sm text-accent">
          <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
          Сборка настроена корректно — можно ставить в очередь.
        </p>
      ) : null}

      {hasWarnings ? (
        <div className="space-y-2.5">
          {warnings.map((item) => (
            <p
              key={item.code + item.message}
              className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-ember/30 bg-ember/[0.06] px-2.5 py-2 text-xs text-ember-bright"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
              {item.message}
            </p>
          ))}
          <button
            type="button"
            onClick={() => onAckChange(!ackWarnings)}
            aria-pressed={ackWarnings}
            className={`focus-ring font-mono-tech inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-colors ${
              ackWarnings
                ? "border-ember/45 bg-ember/[0.1] text-ember-bright"
                : "border-border bg-bg-deep/40 text-muted hover:text-text"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors ${
                ackWarnings ? "border-ember bg-ember text-bg-deep" : "border-muted/60"
              }`}
              aria-hidden
            >
              {ackWarnings ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : null}
            </span>
            Понимаю риски и хочу продолжить
          </button>
        </div>
      ) : null}
    </MachinedCard>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
