import type { ReactNode } from "react";

export interface DetailMetaItem {
  key: string;
  node: ReactNode;
}

interface DetailMetaLineProps {
  items: DetailMetaItem[];
  /** Dot (·) for movie headers; pipe (vertical bar) for franchise hero. */
  separator?: "dot" | "pipe";
  className?: string;
}

export function DetailMetaLine({
  items,
  separator = "dot",
  className = "",
}: DetailMetaLineProps) {
  const visible = items.filter((item) => item.node != null && item.node !== false);
  if (visible.length === 0) return null;

  return (
    <div
      className={`font-mono-tech flex flex-wrap items-center gap-x-3 gap-y-1 text-muted ${className}`}
    >
      {visible.map((item, index) => (
        <span key={item.key} className="flex items-center gap-3">
          {index > 0 ? (
            separator === "pipe" ? (
              <span className="h-2.5 w-px bg-border" aria-hidden />
            ) : (
              <span aria-hidden className="text-faint">
                ·
              </span>
            )
          ) : null}
          {item.node}
        </span>
      ))}
    </div>
  );
}
