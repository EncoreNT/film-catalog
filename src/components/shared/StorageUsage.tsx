import Link from "next/link";
import { formatBytes } from "@/lib/shared/format-bytes";
import type { StorageOption } from "@/lib/shared/storage-types";
import { storageUsagePercent } from "@/lib/storages/storage-capacity";

/** Catalog accounting, deliberately not a filesystem free-space gauge. */
export function StorageUsage({
  storage,
  settingsLink = false,
}: {
  storage: StorageOption;
  settingsLink?: boolean;
}) {
  if (!storage.usage) return null;
  const { knownBytes, unknownSizeCount } = storage.usage;
  const percent = storageUsagePercent(knownBytes, storage.capacityBytes);
  const exceeded = percent != null && percent > 100;
  const percentText =
    percent == null
      ? null
      : percent > 0 && percent < 0.1
        ? "< 0,1%"
        : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(percent)}%`;
  const used = formatBytes(knownBytes, { unit: "binary" });
  const total = formatBytes(storage.capacityBytes, { unit: "binary" });

  return (
    <div className="space-y-2 pt-1 text-xs" data-storage-usage={storage.id}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted">Фильмы в каталоге</span>
        {percentText && (
          <span
            className={`font-mono-tech tabular-nums ${exceeded ? "text-danger" : "text-accent"}`}
          >
            {percentText}
          </span>
        )}
      </div>
      {percent != null && (
        <div
          role="meter"
          aria-label={`Заполненность диска ${storage.name} фильмами из каталога`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(100, percent)}
          aria-valuetext={`${used} из ${total}, ${percentText}`}
          className="h-1.5 overflow-hidden rounded-full bg-border-strong"
        >
          <div
            className={`h-full rounded-full ${exceeded ? "bg-danger" : "bg-accent"}`}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
      )}
      <p className="font-mono-tech tabular-nums text-text">
        {used}
        {total && <span className="text-muted"> из {total}</span>}
      </p>
      <p className="text-faint leading-relaxed">
        {percent == null
          ? "Ёмкость диска не задана."
          : "Только файлы из каталога. Другие данные не учтены."}
        {unknownSizeCount > 0 && ` Без размера: ${unknownSizeCount} релизов.`}
      </p>
      {exceeded && (
        <p className="text-danger">
          Объём файлов превышает ёмкость. Проверьте ёмкость и привязку релизов к
          диску.
        </p>
      )}
      {settingsLink && percent == null && (
        <Link
          className="focus-ring inline-block text-accent hover:underline"
          href="/settings?tab=storages"
        >
          Указать ёмкость в настройках →
        </Link>
      )}
    </div>
  );
}
