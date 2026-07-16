"use client";

import { Check, CircleAlert, X } from "lucide-react";
import type { BuildCapabilities } from "@/lib/builds/build-capabilities";
import { CardSectionHeader } from "@/components/primitives/MachinedCard";

interface BuildCapabilitiesPanelProps {
  capabilities: BuildCapabilities | null;
}

const TOOLS: {
  key: keyof BuildCapabilities;
  label: string;
  role: string;
}[] = [
  { key: "ffmpeg", label: "ffmpeg", role: "перекодирование аудио" },
  { key: "ffprobe", label: "ffprobe", role: "анализ дорожек" },
  { key: "mkvmerge", label: "mkvmerge", role: "сборка итогового MKV" },
];

function shortToolVersion(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/);
  return match ? `v${match[1]}` : null;
}

export function BuildCapabilitiesPanel({ capabilities }: BuildCapabilitiesPanelProps) {
  const missing = capabilities
    ? TOOLS.filter((t) => !capabilities[t.key].available)
    : [];
  const allOk = capabilities != null && missing.length === 0;

  const statusTrailing = capabilities ? (
    <span
      className={`font-mono-tech rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
        allOk
          ? "border-accent/35 bg-accent/[0.08] text-accent-bright"
          : "border-danger/35 bg-danger/[0.08] text-danger"
      }`}
    >
      {allOk ? "все найдены" : `${missing.length} нет в PATH`}
    </span>
  ) : (
    <span className="font-mono-tech rounded-full border border-border bg-bg-deep/50 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-faint">
      проверка…
    </span>
  );

  return (
    <div className="space-y-4">
      <CardSectionHeader
        label="система"
        title="Утилиты сборки"
        trailing={statusTrailing}
      />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {TOOLS.map(({ key, label, role }) => {
          const status = capabilities?.[key];
          const ok = status?.available ?? false;
          const version = shortToolVersion(status?.version);

          return (
            <div
              key={key}
              className={`rounded-[var(--radius-sm)] border px-3 py-2.5 ${
                capabilities
                  ? ok
                    ? "border-accent/30 bg-accent/[0.05]"
                    : "border-danger/35 bg-danger/[0.06]"
                  : "border-border bg-bg-deep/40"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono-tech text-[11px] uppercase tracking-[0.12em] text-text">
                    {label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">{role}</p>
                </div>
                {capabilities ? (
                  ok ? (
                    <Check
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
                      strokeWidth={2}
                      aria-hidden
                    />
                  ) : (
                    <X
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )
                ) : (
                  <span
                    className="neural-pulse mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neural-bright"
                    aria-hidden
                  />
                )}
              </div>
              {version ? (
                <p
                  className="font-mono-tech mt-2 text-[10px] text-faint"
                  title={status?.version ?? undefined}
                >
                  {version}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {capabilities ? (
        allOk ? (
          <p className="flex items-start gap-2 text-sm text-accent-bright">
            <Check className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Все утилиты на месте — можно проверить состав сборки и поставить её в очередь.
          </p>
        ) : (
          <p className="flex items-start gap-2 text-sm text-ember-bright">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
            Без {missing.map((m) => m.label).join(", ")} сборка не запустится. Установите
            ffmpeg и MKVToolNix, затем перезапустите воркер.
          </p>
        )
      ) : (
        <p className="font-mono-tech text-[11px] text-faint">
          Опрашиваем сервер…
        </p>
      )}
    </div>
  );
}
