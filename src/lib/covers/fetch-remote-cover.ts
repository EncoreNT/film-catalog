import {
  COVER_EXT_BY_MIME,
  COVER_FETCH_TIMEOUT_MS,
  COVER_MAX_BYTES,
} from "@/lib/covers/cover-formats";

export { COVER_MAX_BYTES, COVER_FETCH_TIMEOUT_MS };

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type RemoteCoverResult = { buffer: Buffer; ext: string };
export type RemoteCoverError = { message: string; status: number };

export async function fetchRemoteCoverBuffer(
  url: string,
): Promise<RemoteCoverResult | RemoteCoverError> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { message: "Некорректный URL", status: 400 };
  }
  if (!/^https?:$/.test(parsedUrl.protocol)) {
    return {
      message: "Поддерживаются только http/https ссылки",
      status: 400,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), COVER_FETCH_TIMEOUT_MS);
  let resp: Response;
  try {
    resp = await fetch(parsedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: `${parsedUrl.protocol}//${parsedUrl.host}/`,
      },
    });
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || controller.signal.aborted);
    return {
      message: aborted
        ? "Превышено время ожидания загрузки по ссылке"
        : "Не удалось загрузить изображение по ссылке",
      status: 502,
    };
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    return { message: `Источник вернул ${resp.status}`, status: 502 };
  }

  const remoteType = (resp.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const ext = COVER_EXT_BY_MIME[remoteType];
  if (!ext) {
    return {
      message: "По ссылке не изображение (ожидается jpg/png/webp/gif/avif)",
      status: 415,
    };
  }

  const arrayBuffer = await resp.arrayBuffer();
  if (arrayBuffer.byteLength > COVER_MAX_BYTES) {
    return {
      message: `Файл слишком большой (макс. ${COVER_MAX_BYTES / 1024 / 1024} МБ)`,
      status: 413,
    };
  }

  return { buffer: Buffer.from(arrayBuffer), ext };
}
