export const SETTINGS_TABS = [
  { value: "raters", label: "Оценщики" },
  { value: "storages", label: "Диски" },
  { value: "posters", label: "Качество постеров" },
  { value: "scanner", label: "Сканер" },
  { value: "catalog", label: "Каталог" },
  { value: "builds", label: "Сборка" },
  { value: "export", label: "Экспорт" },
] as const;

export type SettingsTab = typeof SETTINGS_TABS[number]["value"];

export function settingsTab(value?: string): SettingsTab {
  return SETTINGS_TABS.find((tab) => tab.value === value)?.value ?? "raters";
}
