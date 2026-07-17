"use client";

import { useState } from "react";
import { Field } from "@/components/primitives/Field";
import { Button } from "@/components/primitives/Button";
import { FormActionBar } from "@/components/primitives/FormActionBar";
import { MachinedCard, CardSectionHeader } from "@/components/primitives/MachinedCard";
import { parseApiError } from "@/lib/api/client";
import {
  commitFilePathInput,
  FILE_PATH_INPUT_HINT,
} from "@/lib/shared/display-path";

interface SettingsFormProps {
  initialMediaSaveDir: string;
}

export function SettingsForm({ initialMediaSaveDir }: SettingsFormProps) {
  const [savedMediaSaveDir, setSavedMediaSaveDir] = useState(initialMediaSaveDir);
  const [mediaSaveDir, setMediaSaveDir] = useState(initialMediaSaveDir);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = mediaSaveDir.trim() !== savedMediaSaveDir.trim();

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    if (mediaSaveDir.trim() === savedMediaSaveDir.trim()) {
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaSaveDir: mediaSaveDir.trim() }),
      });
      if (!res.ok) {
        throw new Error(await parseApiError(res, "Не удалось сохранить настройки"));
      }

      const data = (await res.json()) as {
        mediaSaveDirDisplay?: string | null;
      };

      if (data.mediaSaveDirDisplay != null) {
        setMediaSaveDir(data.mediaSaveDirDisplay);
        setSavedMediaSaveDir(data.mediaSaveDirDisplay);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 pb-24 lg:max-w-3xl">
        <MachinedCard>
          <CardSectionHeader label="экспорт" title="Папка сохранения" />
          <p className="mt-2 max-w-prose text-sm text-muted">
            Куда копировать готовые файлы при экспорте на ТВ и при сборках MKV.
            Папку для сканирования задайте на странице{" "}
            <a href="/scan" className="text-accent hover:underline">
              сканирования
            </a>
            .
          </p>
          <div className="mt-5">
            <Field
              label="Папка сохранения"
              value={mediaSaveDir}
              onChange={(e) => setMediaSaveDir(e.target.value)}
              onBlur={() => {
                const trimmed = mediaSaveDir.trim();
                if (!trimmed) return;
                setMediaSaveDir(commitFilePathInput(trimmed).display);
              }}
              placeholder="D:\TV\Movies или /mnt/d/TV/Movies"
              hint={FILE_PATH_INPUT_HINT}
            />
          </div>
        </MachinedCard>
      </div>

      <FormActionBar isDirty={isDirty} saving={saving} error={error}>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={!isDirty || saving}
        >
          Сохранить
        </Button>
      </FormActionBar>
    </>
  );
}
