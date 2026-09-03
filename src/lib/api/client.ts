export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function parseApiError(
  res: Response,
  fallback = "Ошибка запроса",
): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? fallback;
}

export async function apiFetch<T>(
  url: string,
  init?: RequestInit,
  fallbackError = "Ошибка запроса",
): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new ApiError(await parseApiError(res, fallbackError), res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export type CoverUploadInput =
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

async function postCoverFile(
  uploadUrl: string,
  file: File,
): Promise<{ updatedAt: string }> {
  const formData = new FormData();
  formData.append("cover", file);
  return apiFetch<{ updatedAt: string }>(
    uploadUrl,
    { method: "POST", body: formData },
    "Не удалось загрузить обложку",
  );
}

/** POST cover file or remote URL to a movie/franchise cover endpoint. */
export async function uploadCover(
  uploadUrl: string,
  input: CoverUploadInput,
): Promise<{ updatedAt: string }> {
  if (input.kind === "file") {
    return postCoverFile(uploadUrl, input.file);
  }

  const { fetchCoverUrlAsFile } = await import("@/lib/covers/fetch-cover-client");
  const file = await fetchCoverUrlAsFile(input.url);
  return postCoverFile(uploadUrl, file);
}

/** Best-effort cover upload after entity creation (non-fatal). */
export async function uploadCoverAfterCreate(
  uploadUrl: string,
  file: File | null,
  url: string | null,
): Promise<void> {
  try {
    if (file) {
      await uploadCover(uploadUrl, { kind: "file", file });
    } else if (url) {
      await uploadCover(uploadUrl, { kind: "url", url });
    }
  } catch {
    // Cover upload is non-fatal; the entity is already created.
  }
}

export async function approveMovie(movieId: number): Promise<void> {
  await apiFetch(
    `/api/movies/${movieId}/approve`,
    { method: "POST" },
    "Не удалось опубликовать фильм",
  );
}
