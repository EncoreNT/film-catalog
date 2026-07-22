export const MOVE_RELEASE_MENU_LABEL = "Переместить на другой диск";
export const MOVE_RELEASE_DIALOG_TITLE = "Переместить на другой диск";
export const MOVE_RELEASE_CONFIRM_LABEL = "Переместить";

export interface MoveReleaseAvailability {
  hasFilePath: boolean;
  activeJob: boolean;
  activeExport: boolean;
  activeBuild: boolean;
}

/** Block reason when move is visible but not yet allowed; null if ready. */
export function moveReleaseBlockReason(
  input: MoveReleaseAvailability,
): string | null {
  if (!input.hasFilePath) {
    return "Не указан путь к файлу релиза";
  }
  if (input.activeJob) {
    return "Перемещение уже выполняется";
  }
  if (input.activeExport) {
    return "Дождитесь завершения экспорта";
  }
  if (input.activeBuild) {
    return "Релиз участвует в активной сборке";
  }
  return null;
}
