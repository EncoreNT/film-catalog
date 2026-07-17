import type { Metadata } from "next";
import { EntityEditLayout } from "@/components/layout/EntityEditLayout";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { getMediaSaveDir, mediaSaveDirDisplay } from "@/lib/db/settings";

export const metadata: Metadata = {
  title: "Настройки",
};

export default async function SettingsPage() {
  const mediaSaveDir = await getMediaSaveDir();

  return (
    <EntityEditLayout
      backHref="/"
      backLabel="Назад к каталогу"
      eyebrow="система"
      title="Настройки"
    >
      <SettingsForm
        initialMediaSaveDir={mediaSaveDirDisplay(mediaSaveDir) ?? ""}
      />
    </EntityEditLayout>
  );
}
