export const COVER_MAX_BYTES = 10 * 1024 * 1024;
export const COVER_FETCH_TIMEOUT_MS = 15_000;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

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
      headers: { "User-Agent": "film-catalog-cover-fetch/1.0" },
    });
  } catch {
    return {
      message: "Не удалось загрузить изображение по ссылке",
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
  const ext = MIME_TO_EXT[remoteType];
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
