import { SettingsSection, SettingsRow } from "./SettingsSection";
import { Field } from "@/components/primitives/Field";
import { Select } from "@/components/primitives/Select";
import { AC3_BITRATES, EAC3_BITRATES } from "@/lib/builds/build-presets";

interface BuildsSectionProps {
  transcodeConcurrency: number;
  defaultAc3Bitrate: number;
  defaultEac3Bitrate: number;
  onTranscodeConcurrencyChange: (value: number) => void;
  onDefaultAc3BitrateChange: (value: number) => void;
  onDefaultEac3BitrateChange: (value: number) => void;
}

export function BuildsSection({
  transcodeConcurrency,
  defaultAc3Bitrate,
  defaultEac3Bitrate,
  onTranscodeConcurrencyChange,
  onDefaultAc3BitrateChange,
  onDefaultEac3BitrateChange,
}: BuildsSectionProps) {
  return (
    <SettingsSection title="Сборка MKV" description="Параметры обработки звука для новых сборок. Изменения применяются без перезапуска.">
      <SettingsRow title="Одновременная обработка" description="Чем больше задач, тем выше нагрузка на процессор при перекодировании звука.">
        <div className="settings-number-field">
          <Field label="Параллельных задач" id="build-concurrency"
            type="number"
            min={1}
            max={8}
            step={1}
            value={transcodeConcurrency}
            onChange={(event) => onTranscodeConcurrencyChange(Number(event.target.value))}
          />
          <p className="settings-help">От 1 до 8</p>
        </div>
      </SettingsRow>
      <SettingsRow title="Качество звука" description="Битрейт по умолчанию. Для конкретной сборки его можно изменить в редакторе.">
        <div className="settings-bitrate-fields">
        <Select
          label="AC-3"
          preserveOrder
          value={String(defaultAc3Bitrate)}
          onChange={(value) => onDefaultAc3BitrateChange(Number(value))}
          options={AC3_BITRATES.map((bitrate) => ({
            value: String(bitrate),
            label: `${bitrate} кбит/с`,
          }))}
        />
        <Select
          label="E-AC-3"
          preserveOrder
          value={String(defaultEac3Bitrate)}
          onChange={(value) => onDefaultEac3BitrateChange(Number(value))}
          options={EAC3_BITRATES.map((bitrate) => ({
            value: String(bitrate),
            label: `${bitrate} кбит/с`,
          }))}
        />
        </div>
      </SettingsRow>
    </SettingsSection>
  );
}
