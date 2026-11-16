import { chromium, type BrowserContext, type Page } from "playwright";
import { dataPath } from "@/lib/db/data-path";
import { KinoriumError } from "./kinorium-client";
import { parseKinoriumGallery } from "./kinorium-parser";
import { kinoriumGalleryUrl, type KinoriumGallery } from "./kinorium-types";

const WAIT_MS = 3 * 60_000;

async function launchBrowser(): Promise<BrowserContext> {
  return chromium.launchPersistentContext(dataPath("kinorium-browser"), {
    headless: false,
    viewport: null,
    timeout: 30_000,
    acceptDownloads: false,
  });
}

/** One visible browser at a time; its own profile retains cookies between visits. */
export function createKinoriumBrowser(
  launch: () => Promise<BrowserContext> = launchBrowser,
  timeoutMs = WAIT_MS,
  state = { busy: false },
) {

  return {
    async gallery(id: number, requestSignal: AbortSignal): Promise<KinoriumGallery> {
      if (requestSignal.aborted)
        throw new KinoriumError("Загрузка галереи отменена.", 499);
      if (state.busy)
        throw new KinoriumError(
          "Окно Kinorium уже открыто. Завершите выбор или закройте его.",
          409,
        );
      state.busy = true;
      let context: BrowserContext | undefined;
      let page: Page | undefined;
      let closing: Promise<void> | undefined;
      const close = () => {
        if (context) closing ??= context.close().catch(() => {});
        return closing;
      };
      const timeout = new AbortController();
      const timer = setTimeout(() => timeout.abort(), timeoutMs);
      const signal = AbortSignal.any([requestSignal, timeout.signal]);
      signal.addEventListener("abort", close, { once: true });

      try {
        context = await launch();
        signal.throwIfAborted();
        page = context.pages()[0] ?? (await context.newPage());
        const url = new URL(kinoriumGalleryUrl(id));
        await page.bringToFront();
        try {
          // Readiness is the gallery DOM below, not DOMContentLoaded (ads and a
          // truncated response can prevent that event even on a visible page).
          await page.goto(url.href, { waitUntil: "commit", timeout: 30_000 });
        } catch (error) {
          signal.throwIfAborted();
          if (page.isClosed()) throw error;
          // Keep the window alive: the user can reload after a connection error.
          console.warn("Kinorium: переход прерван; ждём обновления страницы в открытом окне.", error);
        }
        // Let the user complete the site's check. Never interact with the CAPTCHA.
        await page.waitForFunction(
          ({ origin, pathname }) =>
            location.origin === origin &&
            location.pathname === pathname &&
            !!document.querySelector(
              ".gallery_page__item img[data-photo], .emptyGallery",
            ),
          { origin: url.origin, pathname: url.pathname },
          { timeout: timeoutMs, polling: 500 },
        );
        signal.throwIfAborted();
        // The user can navigate the window; only accept the requested movie's page.
        if (new URL(page.url()).origin !== url.origin ||
            new URL(page.url()).pathname !== url.pathname)
          throw new KinoriumError("Открыта другая страница. Повторите загрузку галереи.");
        const html = await page.content();
        if (Buffer.byteLength(html) > 6 * 1024 * 1024)
          throw new KinoriumError("Страница Kinorium слишком большая.", 413);
        const gallery = parseKinoriumGallery(html);
        if (gallery.status !== "available" && gallery.status !== "empty")
          throw new KinoriumError("Не удалось прочитать постеры на странице Kinorium.");
        return gallery;
      } catch (error) {
        if (requestSignal.aborted)
          throw new KinoriumError("Загрузка галереи отменена.", 499);
        if (timeout.signal.aborted)
          throw new KinoriumError("Галерея не загрузилась за три минуты. Повторите попытку; если страница загрузится не полностью, обновите её в открытом окне.", 408);
        if (error instanceof KinoriumError) throw error;
        if (!context)
          throw new KinoriumError(
            "Не удалось открыть Chromium. Выполните npm run kinorium:browser:install и проверьте, что на компьютере с каталогом можно открывать окна.",
            503,
          );
        if (page?.isClosed())
          throw new KinoriumError("Окно Kinorium закрыто. Можно открыть его снова.", 409);
        throw new KinoriumError("Не удалось дождаться галереи Kinorium. Повторите попытку.");
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", close);
        await close();
        state.busy = false;
      }
    },
  };
}

// Keep the profile lock across Next.js development module reloads, too.
const globalBrowser = globalThis as unknown as {
  kinoriumBrowserState?: { busy: boolean };
};
// Retain the lock, not the service closure: HMR must pick up parser fixes.
export const kinoriumBrowser = createKinoriumBrowser(
  launchBrowser, WAIT_MS, globalBrowser.kinoriumBrowserState ??= { busy: false },
);
