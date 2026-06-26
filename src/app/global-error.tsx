"use client";

import { useEffect } from "react";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { Film, ArrowLeft, RefreshCw } from "lucide-react";
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

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html
      lang="ru"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full`}
    >
      <body className="relative min-h-dvh antialiased">
        {/* Minimal ambient backdrop — recreated here because the root layout
            is replaced entirely when this boundary activates */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, #1c1611 0%, #15110d 45%, #120e0a 100%)",
            }}
          />
          <div
            className="ambient-blob-1 absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full opacity-50 blur-[120px]"
            style={{
              background:
                "radial-gradient(circle, rgba(232,176,90,0.16) 0%, transparent 60%)",
            }}
          />
        </div>
        <div
          className="pointer-events-none fixed inset-0 z-[55]"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 35%, transparent 0%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center px-4 py-16 sm:px-6">
          <div className="error-scene-in relative w-full max-w-3xl">
            <div
              className="film-perfs-y absolute inset-y-0 left-0 w-6 opacity-50"
              aria-hidden
            />
            <div
              className="film-perfs-y absolute inset-y-0 right-0 w-6 opacity-50"
              aria-hidden
            />

            <div className="relative flex flex-col items-center px-10 py-16 text-center sm:py-24">
              <div className="relative mb-10">
                <div
                  className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-2xl"
                  aria-hidden
                  style={{
                    background:
                      "radial-gradient(circle, var(--accent-glow) 0%, transparent 65%)",
                  }}
                />
                <span className="lamp-flicker flex h-16 w-16 items-center justify-center rounded-full border border-border-strong bg-gradient-to-br from-accent-soft to-transparent shadow-[0_0_36px_var(--accent-glow)]">
                  <Film className="h-7 w-7 text-accent" aria-hidden />
                </span>
              </div>

              <p className="font-mono-tech mb-6 text-accent">
                аппаратная в темноте
              </p>

              <p
                className="error-code-glow font-display select-none text-[7rem] font-bold leading-none tracking-tight text-text sm:text-[10rem]"
                aria-hidden
              >
                500
              </p>

              <div
                className="my-8 flex w-full max-w-sm items-center gap-3"
                aria-hidden
              >
                <span className="h-px flex-1 bg-gradient-to-r from-transparent to-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_12px_var(--accent-glow)]" />
                <span className="h-px flex-1 bg-gradient-to-l from-transparent to-border" />
              </div>

              <h1 className="font-display max-w-xl text-3xl font-semibold leading-tight tracking-tight text-text sm:text-4xl">
                В аппаратной <em className="text-accent not-italic">погас свет</em>
              </h1>

              <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
                Корневой сбой проекта — рендер прервался на самом верхнем уровне.
                Перемотайте плёнку, а если не запустится — возвращайтесь в каталог.
              </p>

              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={unstable_retry}
                  className="focus-ring inline-flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[var(--radius)] bg-accent px-6 py-3 text-sm font-semibold text-bg-deep shadow-[0_0_28px_var(--accent-glow)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_0_44px_var(--accent-glow)]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Перезапустить сеанс
                </button>
                <Link
                  href="/"
                  className="focus-ring group inline-flex min-h-12 items-center gap-2.5 rounded-[var(--radius)] border border-border-strong bg-bg-surface px-6 py-3 text-sm font-medium text-text transition-all duration-300 hover:border-accent/50 hover:text-accent hover:bg-bg-surface-hover"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5" aria-hidden />
                  В каталог
                </Link>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}
