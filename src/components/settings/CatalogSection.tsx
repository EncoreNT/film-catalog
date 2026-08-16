import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";

const SORT_OPTIONS = [
  { value: "fileDownloadedAt", label: "Дата скачивания" },
  { value: "title", label: "Название" },
  { value: "year", label: "Год" },
  { value: "createdAt", label: "Дата добавления" },
  { value: "rating", label: "Оценка" },
  { value: "watchedAt", label: "Дата просмотра" },
  { value: "durationSeconds", label: "Длительность" },
  { value: "fileSize", label: "Размер" },
] as const;

interface CatalogSectionProps {
  pageSize: number;
  defaultSort: string;
  onPageSizeChange: (value: number) => void;
  onDefaultSortChange: (value: string) => void;
}

export function CatalogSection({
  pageSize,
  defaultSort,
  onPageSizeChange,
  onDefaultSortChange,
}: CatalogSectionProps) {
  return (
    <MachinedCard variant="calm">
      <CardSectionHeader label="каталог" title="Отображение списка" className="mb-5" />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Фильмов на странице">
          <input
            type="number"
            min={1}
            max={100}
            className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-3 text-sm text-text outline-none focus:border-accent/60"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          />
        </Field>
        <Select
          label="Сортировка по умолчанию"
          value={defaultSort}
          onChange={onDefaultSortChange}
          options={SORT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>
    </MachinedCard>
  );
}
