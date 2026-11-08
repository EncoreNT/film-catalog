import { SettingsPageClient } from "@/components/settings/SettingsPageClient";
import { getAppSettingsSnapshot } from "@/lib/db/settings";
import { listRaters } from "@/lib/raters/rater-crud";
import { listExternalStorages } from "@/lib/storages/storage-crud";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const [raters, settings, storages, query] = await Promise.all([
    listRaters(),
    getAppSettingsSnapshot(),
    listExternalStorages(),
    searchParams,
  ]);

  return (
    <SettingsPageClient
      initialRaters={raters.map((rater) => ({
        id: rater.id,
        name: rater.name,
        sortOrder: rater.sortOrder,
      }))}
      initialSettings={settings}
      initialStorages={storages}
      initialTab={query.tab === "storages" ? "storages" : "raters"}
    />
  );
}
