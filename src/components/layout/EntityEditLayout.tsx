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
  /** Pin page chrome; let children manage internal scroll (franchise edit). */
  fillViewport?: boolean;
}

export function EntityEditLayout({
  backHref,
  backLabel,
  eyebrow,
  title,
  titleClassName,
  children,
  fillViewport = false,
}: EntityEditLayoutProps) {
  if (fillViewport) {
    return (
      <div className="flex flex-col gap-6 lg:h-[calc(100dvh-5rem)] lg:min-h-0 lg:overflow-hidden lg:gap-8">
        <div className="shrink-0 space-y-6 lg:space-y-8">
          <BackLink href={backHref}>{backLabel}</BackLink>
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            titleClassName={titleClassName}
          />
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
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
