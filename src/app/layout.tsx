import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Film, ScanSearch } from "lucide-react";
import { GrainOverlay } from "@/components/GrainOverlay";
import { AmbientBackground } from "@/components/AmbientBackground";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "Кинозал — личный архив фильмов",
    template: "%s · Кинозал",
  },
  description: "Домашний каталог фильмов: технические характеристики, звуковые дорожки, субтитры и обложки.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full overflow-x-hidden`}
    >
      <body className="relative min-h-dvh antialiased">
        <AmbientBackground />
        <GrainOverlay />

        <header className="surface-screen sticky top-0 z-40 border-b border-border bg-bg-deep/70 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="focus-ring group flex items-center gap-3 rounded-lg">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-accent-soft to-transparent text-accent transition-all duration-300 group-hover:border-accent/60 group-hover:shadow-[0_0_24px_var(--accent-glow)]"
              >
                <Film className="h-5 w-5" aria-hidden />
              </span>
              <div className="leading-tight">
                <p className="font-display text-lg font-semibold tracking-tight text-text">
                  Кинозал
                </p>
                <p className="font-mono-tech text-faint">личный архив</p>
              </div>
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                href="/"
                className="focus-ring rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-text"
              >
                Каталог
              </Link>
              <Link
                href="/franchises"
                className="focus-ring rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-text"
              >
                Франшизы
              </Link>
              <Link
                href="/scan"
                className="focus-ring flex items-center gap-2 rounded-lg border border-border-strong px-3.5 py-2 text-sm text-text transition-all duration-300 hover:border-accent/50 hover:text-accent hover:shadow-[0_0_20px_var(--accent-glow)]"
              >
                <ScanSearch className="h-4 w-4" aria-hidden />
                Скан
              </Link>
            </nav>
          </div>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
          {children}
        </main>
      </body>
    </html>
  );
}
