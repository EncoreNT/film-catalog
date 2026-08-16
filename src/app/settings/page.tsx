import { SettingsPageClient } from "@/components/settings/SettingsPageClient";
import { getAppSettingsSnapshot } from "@/lib/db/settings";
import { listRaters } from "@/lib/raters/rater-crud";

export default async function SettingsPage() {
  const [raters, settings] = await Promise.all([
    listRaters(),
    getAppSettingsSnapshot(),
  ]);

  return (
    <SettingsPageClient
      initialRaters={raters.map((rater) => ({
        id: rater.id,
        name: rater.name,
        sortOrder: rater.sortOrder,
      }))}
      initialSettings={settings}
    />
  );
}
