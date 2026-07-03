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

/** POST cover file or remote URL to a movie/franchise cover endpoint. */
export async function uploadCover(
  uploadUrl: string,
  input: CoverUploadInput,
): Promise<{ updatedAt: string }> {
  if (input.kind === "file") {
    const formData = new FormData();
    formData.append("cover", input.file);
    return apiFetch<{ updatedAt: string }>(
      uploadUrl,
      { method: "POST", body: formData },
      "Не удалось загрузить обложку",
    );
  }
  return apiFetch<{ updatedAt: string }>(
    uploadUrl,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: input.url }),
    },
    "Не удалось загрузить обложку",
  );
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
