import { SettingsSection } from "./SettingsSection";
import { FolderPathField } from "@/components/shared/FolderPathField";

interface ScannerSectionProps {
  value: string;
  onChange: (runtimePath: string, displayPath: string) => void;
}

export function ScannerSection({ value, onChange }: ScannerSectionProps) {
  return (
    <SettingsSection title="Сканер" description="Откуда добавлять видеофайлы в каталог. Путь будет подставлен при следующем сканировании.">
      <div className="settings-path-field">
      <FolderPathField
        label="Корневая папка"
        value={value}
        onChange={onChange}
        hint="Папка с видеофайлами для импорта в каталог."
      />
        <p className="settings-help">Выберите папку на компьютере или вставьте путь вручную. Сохранение пути не запускает сканирование.</p>
      </div>
    </SettingsSection>
  );
}
