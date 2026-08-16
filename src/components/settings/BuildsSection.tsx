import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
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
    <MachinedCard variant="calm">
      <CardSectionHeader label="сборка" title="MKV-сборки" className="mb-5" />
      <p className="mb-5 text-sm text-muted">
        Параллельность transcode применяется к новым задачам без перезапуска worker.
      </p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Параллельных transcode">
          <input
            type="number"
            min={1}
            max={8}
            className="min-h-10 w-full rounded-[var(--radius-sm)] border border-border bg-bg-deep/60 px-3 text-sm text-text outline-none focus:border-accent/60"
            value={transcodeConcurrency}
            onChange={(event) => onTranscodeConcurrencyChange(Number(event.target.value))}
          />
        </Field>
        <Select
          label="AC-3 битрейт по умолчанию"
          value={String(defaultAc3Bitrate)}
          onChange={(value) => onDefaultAc3BitrateChange(Number(value))}
          options={AC3_BITRATES.map((bitrate) => ({
            value: String(bitrate),
            label: `${bitrate} kbps`,
          }))}
        />
        <Select
          label="E-AC-3 битрейт по умолчанию"
          value={String(defaultEac3Bitrate)}
          onChange={(value) => onDefaultEac3BitrateChange(Number(value))}
          options={EAC3_BITRATES.map((bitrate) => ({
            value: String(bitrate),
            label: `${bitrate} kbps`,
          }))}
        />
      </div>
    </MachinedCard>
  );
}
