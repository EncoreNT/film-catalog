import { Pencil } from "lucide-react";
import Link from "next/link";

interface EditEntityLinkProps {
  href: string;
  title: string;
  label?: string;
  showIcon?: boolean;
}

export function EditEntityLink({
  href,
  title,
  label = "редактировать",
  showIcon = true,
}: EditEntityLinkProps) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex shrink-0 items-center gap-2 rounded-full border border-border-strong bg-bg-surface px-3.5 py-1.5 text-xs text-muted transition-all duration-300 hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
      title={title}
    >
      {showIcon ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : null}
      <span className="font-mono-tech">{label}</span>
    </Link>
  );
}
