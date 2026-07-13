import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SiteHeader } from "@/components/layout/SiteHeader";
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

export const metadata: Metadata = {
  title: {
    default: "Кинозал — личный архив фильмов",
    template: "%s · Кинозал",
  },
  description:
    "Домашний каталог фильмов: технические характеристики, звуковые дорожки, субтитры и обложки.",
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
      className={`${fraunces.variable} ${manrope.variable} ${jetbrains.variable} h-full overflow-x-hidden`}
    >
      <body className="relative min-h-dvh antialiased">
        <AmbientBackground />
        <GrainOverlay />

        <SiteHeader />

        <main className="container-wide relative z-10 px-6 pt-4 pb-8 lg:px-10 lg:pt-5 lg:pb-10 xl:px-14 2xl:px-20 3xl:px-24">
          {children}
        </main>
      </body>
    </html>
  );
}
