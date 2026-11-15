import { SettingsSection, SettingsRow } from "./SettingsSection";
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
    <SettingsSection title="Каталог" description="Настройте плотность списка и порядок фильмов при открытии каталога.">
      <SettingsRow title="Размер страницы" description="Больше фильмов на странице, меньше переключений между страницами.">
        <div className="settings-number-field">
          <Field label="Фильмов на странице" id="catalog-page-size"
            type="number"
            min={1}
            max={100}
            step={1}
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          />
          <p className="settings-help">От 1 до 100</p>
        </div>
      </SettingsRow>
      <SettingsRow title="Порядок фильмов" description="Применяется, если вы не выбрали другую сортировку в самом каталоге.">
        <Select
          label="Сортировка по умолчанию"
          value={defaultSort}
          onChange={onDefaultSortChange}
          options={SORT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
