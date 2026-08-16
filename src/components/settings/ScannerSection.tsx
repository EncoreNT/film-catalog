import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { FolderPathField } from "@/components/shared/FolderPathField";

interface ScannerSectionProps {
  value: string;
  onChange: (runtimePath: string, displayPath: string) => void;
}

export function ScannerSection({ value, onChange }: ScannerSectionProps) {
  return (
    <MachinedCard variant="calm">
      <CardSectionHeader label="сканер" title="Папка для сканирования" className="mb-5" />
      <FolderPathField
        label="Корневая папка"
        value={value}
        onChange={onChange}
        hint="Папка с видеофайлами для импорта в каталог."
      />
    </MachinedCard>
  );
}
