import type { ReactNode } from "react";
import { BackLink } from "@/components/primitives/BackLink";
import { PageHeader } from "@/components/primitives/PageHeader";

interface EntityEditLayoutProps {
  backHref: string;
  backLabel: string;
  eyebrow: string;
  title: string;
  titleClassName?: string;
  children: ReactNode;
}

export function EntityEditLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  titleClassName,
  children,
}: EntityEditLayoutProps) {
  return (
    <div className="space-y-10">
      <BackLink href={backHref}>{backLabel}</BackLink>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        titleClassName={titleClassName}
      />
      {children}
    </div>
  );
}
