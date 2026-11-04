"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Plus, ScanLine, Settings2 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Каталог" },
  { href: "/franchises", label: "Франшизы" },
  { href: "/builds", label: "Сборки" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/" || pathname.startsWith("/movies/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The navigation scrolls away; the catalog keeps its own sticky search deck. */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="site-header">
      <Link href="/" className="site-brand focus-ring"><Film aria-hidden /><span>Кинозал</span></Link>
      <nav aria-label="Основная навигация">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className="focus-ring" aria-current={isActive(pathname, item.href) ? "page" : undefined}>{item.label}</Link>
        ))}
      </nav>
      <div className="site-actions">
        <Link href="/movies/new" className="site-action focus-ring" aria-label="Добавить фильм"><Plus aria-hidden /><span>Добавить фильм</span></Link>
        <Link href="/scan" className="site-action site-action-accent focus-ring" aria-label="Сканировать"><ScanLine aria-hidden /><span>Сканировать</span></Link>
        <Link href="/settings" className="site-action focus-ring" aria-label="Настройки" title="Настройки" aria-current={isActive(pathname, "/settings") ? "page" : undefined}><Settings2 aria-hidden /></Link>
      </div>
    </header>
  );
}
