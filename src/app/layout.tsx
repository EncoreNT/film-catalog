import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { GrainOverlay } from "@/components/layout/GrainOverlay";
import { AmbientBackground } from "@/components/layout/AmbientBackground";
import { SpotlightAimProvider } from "@/components/layout/SpotlightAimProvider";
import { SiteHeader } from "@/components/layout/SiteHeader";
import "./globals.css";

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
      className={`${fontVariables} h-full overflow-x-hidden`}
    >
      <body className="relative min-h-dvh antialiased">
        <SpotlightAimProvider>
          <AmbientBackground />
          <GrainOverlay />

          <SiteHeader />

          <main className="container-wide relative z-10 px-6 pt-4 pb-8 lg:px-10 lg:pt-5 lg:pb-10 xl:px-14 2xl:px-20 3xl:px-24">
            {children}
          </main>
        </SpotlightAimProvider>
      </body>
    </html>
  );
}
