import localFont from "next/font/local";

/** Display serif — bundled variable cuts (latin + latin-ext). */
export const fraunces = localFont({
  src: [
    {
      path: "../fonts/fraunces-latin.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../fonts/fraunces-latin-ext.woff2",
      weight: "100 900",
      style: "normal",
    },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

/** UI sans — bundled variable cuts (latin + cyrillic for Russian UI). */
export const manrope = localFont({
  src: [
    {
      path: "../fonts/manrope-latin.woff2",
      weight: "200 800",
      style: "normal",
    },
    {
      path: "../fonts/manrope-cyrillic.woff2",
      weight: "200 800",
      style: "normal",
    },
  ],
  variable: "--font-manrope",
  display: "swap",
});

/** Tech mono labels — bundled variable cuts (latin + cyrillic). */
export const jetbrains = localFont({
  src: [
    {
      path: "../fonts/jetbrains-mono-latin.woff2",
      weight: "100 800",
      style: "normal",
    },
    {
      path: "../fonts/jetbrains-mono-cyrillic.woff2",
      weight: "100 800",
      style: "normal",
    },
  ],
  variable: "--font-jetbrains",
  display: "swap",
});

export const fontVariables = `${fraunces.variable} ${manrope.variable} ${jetbrains.variable}`;
