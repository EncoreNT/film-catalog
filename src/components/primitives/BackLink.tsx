import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export function BackLink({ href, children, className }: BackLinkProps) {
  return (
    <Link
      href={href}
      className={
        className ??
        "focus-ring inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-accent"
      }
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {children}
    </Link>
  );
}
