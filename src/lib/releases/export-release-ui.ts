export const EXPORT_RELEASE_MENU_LABEL = "Скинуть на диск";
export const EXPORT_RELEASE_DIALOG_TITLE = "Скинуть на диск";
export const EXPORT_RELEASE_CONFIRM_LABEL = "Скинуть";

export interface ExportReleaseAvailability {
  hasFilePath: boolean;
  mediaSaveDirConfigured: boolean;
}

/** Block reason when export is visible but not yet allowed; null if ready. */
export function exportReleaseBlockReason(
  input: ExportReleaseAvailability,
): string | null {
  if (input.hasFilePath && input.mediaSaveDirConfigured) {
    return null;
  }
  if (!input.hasFilePath) {
    return "Не указан путь к файлу релиза";
  }
  if (!input.mediaSaveDirConfigured) {
    return "Не задана папка сохранения — Сканирование → Папка сохранения";
  }
  return null;
}
