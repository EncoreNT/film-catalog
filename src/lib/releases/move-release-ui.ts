export const MOVE_RELEASE_MENU_LABEL = "Переместить";
export const MOVE_RELEASE_DIALOG_TITLE = "Переместить";
export const MOVE_RELEASE_CONFIRM_LABEL = "Переместить";

export const MOVE_RELEASE_INTRO =
  "Выберите хранилище и папку. На том же диске файл переедет без копирования. На другой диск сначала копируется, затем исходник удаляется.";

export const MOVE_RELEASE_SAME_DISK_HINT =
  "Тот же диск: перемещение без копирования.";

export const MOVE_RELEASE_ACTIVE_COPY =
  "Файл копируется на другой диск. После проверки каталог обновится, а исходник будет удалён. Можно закрыть диалог: прогресс останется под вкладками релиза и в списке фоновых задач.";

export const MOVE_RELEASE_ACTIVE_RENAME =
  "Файл перемещается в рамках того же диска без копирования. Каталог обновится сразу после. Можно закрыть диалог: прогресс останется под вкладками релиза и в списке фоновых задач.";

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
