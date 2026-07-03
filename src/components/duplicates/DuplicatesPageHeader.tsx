import { PageHeader } from "@/components/primitives/PageHeader";

export function DuplicatesPageHeader() {
  return (
    <PageHeader
      title="Возможные дубли"
      titleClassName="font-display text-3xl font-bold"
      subtitle="Фильмы с одинаковым названием и годом. Объедините их, чтобы собрать все релизы в одной карточке каталога."
    />
  );
}
