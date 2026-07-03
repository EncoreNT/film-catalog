import { PageHeader } from "@/components/primitives/PageHeader";

interface EditPageHeaderProps {
  eyebrow: string;
  title: string;
  titleClassName?: string;
}

export function EditPageHeader({
  eyebrow,
  title,
  titleClassName = "font-display text-3xl font-bold tracking-tight sm:text-4xl",
}: EditPageHeaderProps) {
  return (
    <PageHeader eyebrow={eyebrow} title={title} titleClassName={titleClassName} />
  );
}
