"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Каталог" },
  { href: "/franchises", label: "Франшизы" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/" || pathname.startsWith("/movies/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Compact centered floating-island navigation.
 * The pill is `w-max mx-auto`: a detached glass island centered at the top,
 * not a full-width bar. Logo and nav share one grouped single-line cluster,
 * so there is no dead center and no width mismatch with the page content
 * container below. Scan lives in the catalog console, not here (single
 * primary CTA per intent).
 * Non-sticky by design: the island sits at the top of the page and scrolls
 * away with the content. The catalog's own sticky toolbar (FilterToolbar
 * deck) sticks at the viewport top independently, without reserving space
 * for this header.
 */
export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="relative z-10 px-4 pt-4 sm:px-6 sm:pt-5">
      <div className="mx-auto flex w-max max-w-full items-center gap-1.5 rounded-[var(--radius-pill)] border border-border-strong bg-bg-glass px-2 py-1.5 backdrop-blur-xl sm:gap-4 sm:px-5 sm:py-2">
        <Link
          href="/"
          className="focus-ring group flex items-center gap-2.5 rounded-full py-1 pr-2 sm:gap-4 sm:pr-3"
        >
          <span className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-accent-soft via-accent-soft to-transparent text-accent transition-all duration-300 group-hover:border-accent/60 group-hover:shadow-[0_0_22px_rgba(232,176,90,0.55)]">
            <Film className="h-3.5 w-3.5" aria-hidden />
          </span>
          <span className="font-display block text-base font-semibold leading-none tracking-tight text-text">
            Кинозал
          </span>
        </Link>

        <span
          className="mx-0.5 h-6 w-px shrink-0 bg-border-strong/40 sm:h-7"
          aria-hidden
        />

        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring relative rounded-full px-2 py-1.5 text-[0.8rem] font-medium whitespace-nowrap transition-all duration-200 sm:px-5 sm:py-1.5 sm:text-sm ${
                  active
                    ? "bg-accent/12 text-accent"
                    : "text-muted hover:bg-bg-surface-hover hover:text-text"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
