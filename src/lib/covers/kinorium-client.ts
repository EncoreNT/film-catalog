import { COVER_EXT_BY_MIME, COVER_MAX_BYTES } from "./cover-formats";
import {
  kinoriumImageUrl,
  parseKinoriumGallery,
  parseKinoriumSearch,
} from "./kinorium-parser";
import {
  kinoriumGalleryUrl,
  type KinoriumGallery,
  type KinoriumMovie,
} from "./kinorium-types";

export class KinoriumError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
  ) {
    super(message);
    this.name = "KinoriumError";
  }
}

const ORIGIN = "https://ru.kinorium.com";
const TIMEOUT_MS = 12_000;
const CACHE_LIMIT = 60;

/** A small process-local cache. Nothing is persisted to SQLite or disk. */
export function createKinoriumClient(fetcher: typeof fetch = fetch) {
  const cache = new Map<string, { expires: number; value: unknown }>();
  async function cached<T>(
    key: string,
    ttl: number,
    read: () => Promise<T>,
  ): Promise<T> {
    const entry = cache.get(key);
    if (entry && entry.expires > Date.now()) return entry.value as T;
    cache.delete(key);
    const value = await read();
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + ttl, value });
    return value;
  }

  async function read(url: string, maxBytes: number, image = false) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetcher(url, {
        redirect: "error",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          Referer: `${ORIGIN}/`,
          Accept: image ? "image/*" : "application/json,text/html;q=0.9",
          ...(image ? {} : { "X-Requested-With": "XMLHttpRequest" }),
        },
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new KinoriumError(
          response.status === 403 || response.status === 429
            ? "Kinorium временно ограничил доступ. Попробуйте позже."
            : "Не удалось получить ответ от Kinorium.",
          response.status === 403 || response.status === 429 ? 503 : 502,
        );
      }
      const mime = (response.headers.get("content-type") ?? "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (image && !COVER_EXT_BY_MIME[mime]) {
        await response.body?.cancel();
        throw new KinoriumError("Kinorium вернул страницу вместо изображения.");
      }
      if (Number(response.headers.get("content-length")) > maxBytes) {
        await response.body?.cancel();
        throw new KinoriumError("Ответ Kinorium слишком большой.", 413);
      }
      if (!response.body)
        throw new KinoriumError("Kinorium вернул пустой ответ.");
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) {
            await reader.cancel();
            throw new KinoriumError("Ответ Kinorium слишком большой.", 413);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
      return { buffer: Buffer.concat(chunks), mime };
    } catch (error) {
      if (error instanceof KinoriumError) throw error;
      throw new KinoriumError(
        controller.signal.aborted
          ? "Kinorium не ответил вовремя. Повторите поиск."
          : "Не удалось подключиться к Kinorium. Повторите попытку.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    search(query: string, year?: number): Promise<KinoriumMovie[]> {
      return cached(`search:${query}:${year ?? ""}`, 5 * 60_000, async () => {
        const url = new URL("/handlers/Search/", ORIGIN);
        url.searchParams.set("str", query);
        const { buffer } = await read(url.href, 2 * 1024 * 1024);
        try {
          return parseKinoriumSearch(
            JSON.parse(buffer.toString("utf8")),
            query,
            year,
          );
        } catch {
          throw new KinoriumError(
            "Поиск Kinorium сейчас недоступен. Попробуйте позже.",
          );
        }
      });
    },
    gallery(id: number): Promise<KinoriumGallery> {
      // Keep the blocked state briefly, so switching posters does not hammer the site.
      return cached(`gallery:${id}`, 60_000, async () => {
        try {
          const { buffer } = await read(
            kinoriumGalleryUrl(id),
            6 * 1024 * 1024,
          );
          return parseKinoriumGallery(buffer.toString("utf8"));
        } catch (error) {
          return {
            status:
              error instanceof KinoriumError && error.status === 503
                ? "blocked"
                : "unavailable",
            posters: [],
          };
        }
      });
    },
    async image(url: string) {
      const allowed = kinoriumImageUrl(url);
      if (!allowed)
        throw new KinoriumError("Недопустимая ссылка на постер Kinorium.", 400);
      return read(allowed, COVER_MAX_BYTES, true);
    },
  };
}

export const kinorium = createKinoriumClient();
