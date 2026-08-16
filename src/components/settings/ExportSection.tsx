import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { FolderPathField } from "@/components/shared/FolderPathField";

interface ExportSectionProps {
  value: string;
  onChange: (runtimePath: string, displayPath: string) => void;
}

export function ExportSection({ value, onChange }: ExportSectionProps) {
  return (
    <MachinedCard variant="calm">
      <CardSectionHeader label="экспорт" title="Папка экспорта TV-ready" className="mb-5" />
      <FolderPathField
        label="Целевая папка"
        value={value}
        onChange={onChange}
        hint="Папка по умолчанию для экспорта релизов."
      />
    </MachinedCard>
  );
}
