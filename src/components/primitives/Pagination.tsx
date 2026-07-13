"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pages: number;
  buildHref: (page: number) => string;
}

function pageRange(current: number, pages: number): (number | "...")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "...")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(pages - 1, current + 1);
  if (start > 2) out.push("...");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pages - 1) out.push("...");
  out.push(pages);
  return out;
}

export function Pagination({ page, pages, buildHref }: PaginationProps) {
  if (pages <= 1) return null;

  const items = pageRange(page, pages);

  const baseBtn =
    "flex h-9 min-w-9 items-center justify-center rounded-full border border-border px-3 text-sm backdrop-blur-md transition-all duration-300";
  const idle =
    "text-muted hover:border-accent/55 hover:text-accent hover:bg-bg-surface-hover";
  const active =
    "border-accent/70 bg-accent/15 text-accent font-semibold shadow-[0_0_16px_rgba(232,176,90,0.55)]";
  const disabled = "cursor-not-allowed border-border/50 text-faint/50";

  return (
    <nav
      aria-label="Пагинация"
      className="mt-10 flex flex-wrap items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          aria-label="Предыдущая страница"
          className={`${baseBtn} ${idle}`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled className={`${baseBtn} ${disabled}`}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </span>
      )}

      {items.map((it, idx) =>
        it === "..." ? (
          <span
            key={`gap-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-faint"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={buildHref(it)}
            aria-current={it === page ? "page" : undefined}
            className={`${baseBtn} ${it === page ? active : idle}`}
          >
            {it}
          </Link>
        ),
      )}

      {page < pages ? (
        <Link
          href={buildHref(page + 1)}
          aria-label="Следующая страница"
          className={`${baseBtn} ${idle}`}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <span aria-disabled className={`${baseBtn} ${disabled}`}>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      )}
    </nav>
  );
}
