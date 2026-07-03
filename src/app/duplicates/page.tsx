import { findAllDuplicateGroups } from "@/lib/merge/alternative-quality";
import { DuplicatesPageHeader } from "@/components/duplicates/DuplicatesPageHeader";
import { DuplicateGroupList } from "@/components/duplicates/DuplicateGroupList";

export default async function DuplicatesPage() {
  const groups = await findAllDuplicateGroups();

  return (
    <div className="space-y-8">
      <DuplicatesPageHeader />
      <DuplicateGroupList groups={groups} />
    </div>
  );
}
