import { SettingsSection } from "./SettingsSection";
import { FolderPathField } from "@/components/shared/FolderPathField";

interface ExportSectionProps {
  value: string;
  onChange: (runtimePath: string, displayPath: string) => void;
}

export function ExportSection({ value, onChange }: ExportSectionProps) {
  return (
    <SettingsSection title="Экспорт" description="Куда копировать релизы, подготовленные для просмотра на телевизоре.">
      <div className="settings-path-field">
      <FolderPathField
        label="Целевая папка"
        value={value}
        onChange={onChange}
        hint="Папка по умолчанию для экспорта релизов."
      />
        <p className="settings-help">Папка используется по умолчанию. При экспорте отдельного релиза можно выбрать другую.</p>
      </div>
    </SettingsSection>
  );
}
