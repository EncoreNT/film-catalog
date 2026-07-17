"use client";

import { AlertCircle, Check } from "lucide-react";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";

interface BuildWarning {
  code: string;
  message: string;
  severity: string;
}

interface BuildWarningsPanelProps {
  validation: {
    ok: boolean;
    warnings: BuildWarning[];
    errors?: BuildWarning[];
    error?: string;
  };
  ackWarnings: boolean;
  onAckChange: (value: boolean) => void;
}

export function BuildWarningsPanel({
  validation,
  ackWarnings,
  onAckChange,
}: BuildWarningsPanelProps) {
  const errors = validation.errors ?? [];
  const warnings = validation.warnings ?? [];

  return (
    <MachinedCard variant="calm" bodyClassName="space-y-4">
      <CardSectionHeader label="проверка" title="Результат валидации" />
      {!validation.ok ? (
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {validation.error ?? "Есть ошибки"}
          </p>
          {errors.map((item) => (
            <p key={item.code} className="text-sm text-danger">
              {item.message}
            </p>
          ))}
        </div>
      ) : (
        <p className="flex items-start gap-2 text-sm text-accent">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Сборка готова к постановке в очередь
        </p>
      )}
      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((item) => (
            <p key={item.code + item.message} className="text-sm text-ember">
              {item.message}
            </p>
          ))}
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={ackWarnings}
              onChange={(e) => onAckChange(e.target.checked)}
            />
            Понимаю предупреждения и хочу продолжить
          </label>
        </div>
      ) : null}
    </MachinedCard>
  );
}
