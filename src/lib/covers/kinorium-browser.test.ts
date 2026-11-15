import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowserContext } from "playwright";
import { createKinoriumBrowser } from "./kinorium-browser";

const html = `<div class="gallery_page__item"><img data-id="1"
  data-photo="https://images.kinorium.com/movie/poster/776186/w1500_1.jpg"
  data-photo-hd="https://images.kinorium.com/movie/poster/776186/original_1.jpg"
  data-width="2000" data-height="3000"></div>`;

function fakeBrowser() {
  let closed = false;
  let rejectWait: (error: Error) => void = () => {};
  const page = {
    goto: vi.fn().mockResolvedValue(undefined),
    bringToFront: vi.fn().mockResolvedValue(undefined),
    url: () => "https://ru.kinorium.com/776186/gallery/poster/",
    content: vi.fn().mockResolvedValue(html),
    isClosed: () => closed,
    waitForFunction: vi.fn().mockResolvedValue(undefined),
  };
  const close = vi.fn(async () => {
    closed = true;
    rejectWait(new Error("Page closed"));
  });
  return {
    page,
    close,
    context: { pages: () => [page], close } as unknown as BrowserContext,
    waitForUser() {
      page.waitForFunction.mockImplementation(() =>
        new Promise<void>((_resolve, reject) => { rejectWait = reject; }),
      );
    },
  };
}

afterEach(() => vi.useRealTimers());

describe("Kinorium visible browser", () => {
  it("reads the requested gallery and closes the browser, retaining its disk profile", async () => {
    const browser = fakeBrowser();
    const client = createKinoriumBrowser(async () => browser.context);
    const gallery = await client.gallery(776186, new AbortController().signal);
    expect(gallery.posters[0].url).toContain("/original_1.jpg");
    expect(browser.page.goto).toHaveBeenCalledWith(
      "https://ru.kinorium.com/776186/gallery/poster/",
      expect.anything(),
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("cancels a CAPTCHA wait and permits another request after cleanup", async () => {
    const browser = fakeBrowser();
    browser.waitForUser();
    const launch = vi.fn().mockResolvedValue(browser.context);
    const client = createKinoriumBrowser(launch);
    const abort = new AbortController();
    const pending = client.gallery(776186, abort.signal);
    const rejected = expect(pending).rejects.toMatchObject({ status: 499 });
    await vi.waitFor(() => expect(browser.page.waitForFunction).toHaveBeenCalled());
    await expect(client.gallery(776186, new AbortController().signal))
      .rejects.toMatchObject({ status: 409 });
    expect(launch).toHaveBeenCalledTimes(1);
    abort.abort();
    await rejected;
    expect(browser.close).toHaveBeenCalledTimes(1);
    launch.mockResolvedValue(fakeBrowser().context);
    await expect(client.gallery(776186, new AbortController().signal))
      .resolves.toMatchObject({ status: "available" });
  });

  it("closes even if cancellation arrives while Chromium is starting", async () => {
    const browser = fakeBrowser();
    let finishLaunch!: (context: BrowserContext) => void;
    const client = createKinoriumBrowser(() => new Promise(resolve => { finishLaunch = resolve; }));
    const abort = new AbortController();
    const pending = client.gallery(776186, abort.signal);
    const rejected = expect(pending).rejects.toMatchObject({ status: 499 });
    abort.abort();
    finishLaunch(browser.context);
    await rejected;
    expect(browser.page.goto).not.toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("limits manual verification time and closes the window on timeout", async () => {
    vi.useFakeTimers();
    const browser = fakeBrowser();
    browser.waitForUser();
    const client = createKinoriumBrowser(async () => browser.context, 1000);
    const rejected = expect(client.gallery(776186, new AbortController().signal))
      .rejects.toMatchObject({ status: 408 });
    await vi.advanceTimersByTimeAsync(1001);
    await rejected;
    expect(browser.close).toHaveBeenCalledTimes(1);
  });

  it("reports manual window closure without leaving the profile busy", async () => {
    const browser = fakeBrowser();
    browser.waitForUser();
    const launch = vi.fn().mockResolvedValue(browser.context);
    const client = createKinoriumBrowser(launch);
    const rejected = expect(client.gallery(776186, new AbortController().signal))
      .rejects.toMatchObject({ status: 409 });
    await vi.waitFor(() => expect(browser.page.waitForFunction).toHaveBeenCalled());
    await browser.close();
    await rejected;
    launch.mockResolvedValue(fakeBrowser().context);
    await expect(client.gallery(776186, new AbortController().signal))
      .resolves.toMatchObject({ status: "available" });
  });

  it("rejects a changed page and oversized HTML, closing in both cases", async () => {
    const browser = fakeBrowser();
    const client = createKinoriumBrowser(async () => browser.context);
    browser.page.url = () => "https://ru.kinorium.com/123/gallery/poster/";
    await expect(client.gallery(776186, new AbortController().signal))
      .rejects.toThrow("другая страница");
    expect(browser.page.content).not.toHaveBeenCalled();
    browser.page.url = () => "https://ru.kinorium.com/776186/gallery/poster/";
    browser.page.content.mockResolvedValue("x".repeat(6 * 1024 * 1024 + 1));
    await expect(client.gallery(776186, new AbortController().signal))
      .rejects.toMatchObject({ status: 413 });
    expect(browser.close).toHaveBeenCalledTimes(2);
  });

  it("does not expose process launch details and can retry after installation", async () => {
    const launch = vi.fn().mockRejectedValueOnce(new Error("private profile details"))
      .mockResolvedValue(fakeBrowser().context);
    const client = createKinoriumBrowser(launch);
    await expect(client.gallery(776186, new AbortController().signal))
      .rejects.toMatchObject({ status: 503, message: expect.stringContaining("kinorium:browser:install") });
    await expect(client.gallery(776186, new AbortController().signal))
      .resolves.toMatchObject({ status: "available" });
  });
});
