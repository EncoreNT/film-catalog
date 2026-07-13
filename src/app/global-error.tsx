"use client";

import { useEffect } from "react";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { ErrorSceneFrame } from "@/components/layout/ErrorScene";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable} h-full`}
    >
      <body className="relative min-h-dvh antialiased">
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
          <ErrorSceneFrame
            code="500"
            eyebrow="аппаратная в темноте"
            title={
              <>
                В аппаратной <em className="text-accent not-italic">погас свет</em>
              </>
            }
            description="Корневой сбой проекта — рендер прервался на самом верхнем уровне. Перемотайте плёнку, а если не запустится — возвращайтесь в каталог."
            className="error-scene-in relative w-full max-w-3xl"
            actions={
              <>
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
              </>
            }
          />
        </main>
      </body>
    </html>
  );
}
