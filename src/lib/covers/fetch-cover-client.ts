import {
  COVER_MAX_BYTES,
  coverExtFromMime,
  isCoverImageMime,
} from "@/lib/covers/cover-formats";

const COVER_URL_FETCH_HINT =
  "Сохраните изображение на компьютер и загрузите файлом.";

function coverFileFromBlob(blob: Blob, mime: string): File {
  const ext = coverExtFromMime(mime) ?? ".jpg";
  const fileName = `cover${ext}`;
  return new File([blob], fileName, { type: mime });
}

function assertCoverBlob(blob: Blob, mime: string): void {
  if (!isCoverImageMime(mime)) {
    throw new Error(
      "По ссылке не изображение (ожидается jpg/png/webp/gif/avif)",
    );
  }
  if (blob.size > COVER_MAX_BYTES) {
    throw new Error(
      `Файл слишком большой (макс. ${COVER_MAX_BYTES / 1024 / 1024} МБ)`,
    );
  }
}

async function fetchCoverUrlViaFetch(url: string): Promise<File> {
  const resp = await fetch(url, { redirect: "follow", mode: "cors" });
  if (!resp.ok) {
    throw new Error(`Источник вернул ${resp.status}`);
  }
  const mime =
    resp.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ??
    "image/jpeg";
  const blob = await resp.blob();
  assertCoverBlob(blob, mime);
  return coverFileFromBlob(blob, mime);
}

function loadImageElement(url: string, crossOrigin: boolean): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Не удалось прочитать изображение"));
    img.src = url;
  });
}

async function fetchCoverUrlViaCanvas(url: string): Promise<File> {
  const img = await loadImageElement(url, true);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx || canvas.width === 0 || canvas.height === 0) {
    throw new Error("Не удалось прочитать изображение");
  }
  ctx.drawImage(img, 0, 0);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("Не удалось прочитать изображение")),
      "image/jpeg",
      0.92,
    );
  });
  assertCoverBlob(blob, blob.type || "image/jpeg");
  return coverFileFromBlob(blob, blob.type || "image/jpeg");
}

/** Browser-only: download a remote cover and return a File for multipart upload. */
export async function fetchCoverUrlAsFile(url: string): Promise<File> {
  try {
    return await fetchCoverUrlViaFetch(url);
  } catch {
    try {
      return await fetchCoverUrlViaCanvas(url);
    } catch {
      throw new Error(
        `Не удалось загрузить изображение по ссылке. ${COVER_URL_FETCH_HINT}`,
      );
    }
  }
}
