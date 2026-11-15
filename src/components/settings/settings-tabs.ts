export const SETTINGS_TABS = [
  { value: "catalog", label: "Каталог", group: "Коллекция" },
  { value: "raters", label: "Оценщики", group: "Коллекция" },
  { value: "posters", label: "Качество постеров", group: "Коллекция" },
  { value: "storages", label: "Диски", group: "Файлы и обработка" },
  { value: "scanner", label: "Сканер", group: "Файлы и обработка" },
  { value: "builds", label: "Сборка", group: "Файлы и обработка" },
  { value: "export", label: "Экспорт", group: "Файлы и обработка" },
] as const;

export type SettingsTab = typeof SETTINGS_TABS[number]["value"];

export function settingsTab(value?: string): SettingsTab {
  return SETTINGS_TABS.find((tab) => tab.value === value)?.value ?? "raters";
}
