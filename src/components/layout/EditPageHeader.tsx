interface EditPageHeaderProps {
  eyebrow: string;
  title: string;
  titleClassName?: string;
}

export function EditPageHeader({
  eyebrow,
  title,
  titleClassName = "font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl",
}: EditPageHeaderProps) {
  return (
    <header>
      <p className="font-mono-tech text-accent">{eyebrow}</p>
      <h1 className={titleClassName}>{title}</h1>
    </header>
  );
}
