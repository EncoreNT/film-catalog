"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { parseNdjsonStream } from "@/lib/api/ndjson-stream";
import { Button } from "@/components/primitives/Button";
import type { Hdr10PlusRescanEvent } from "@/lib/media/hdr10plus-rescan";

type FileResult = Extract<Hdr10PlusRescanEvent, { type: "file" }>;
type ErrorResult = Extract<Hdr10PlusRescanEvent, { type: "error" }>;
type Summary = Extract<Hdr10PlusRescanEvent, { type: "summary" }>;

export function Hdr10PlusRescanPanel() {
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [found, setFound] = useState<FileResult[]>([]);
  const [errors, setErrors] = useState<ErrorResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setRunning(true);
    setIndex(0);
    setTotal(0);
    setCurrentTitle(null);
    setFound([]);
    setErrors([]);
    setSummary(null);

    try {
      const res = await fetch("/api/dev/hdr10plus-rescan", {
        method: "POST",
        signal: abort.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error("Не удалось запустить перепрогон");
      }
      await parseNdjsonStream<Hdr10PlusRescanEvent>(res.body, (event) => {
        if (event.type === "start") {
          setTotal(event.total);
          return;
        }
        if (event.type === "file") {
          setIndex(event.index);
          setTotal(event.total);
          setCurrentTitle(event.movieTitle);
          if (event.found) {
            setFound((current) => [...current, event]);
          }
          return;
        }
        if (event.type === "error") {
          setIndex(event.index);
          setTotal(event.total);
          setCurrentTitle(event.movieTitle);
          setErrors((current) => [...current, event]);
          return;
        }
        if (event.type === "summary") {
          setSummary(event);
        }
      });
    } catch (err) {
      if (abort.signal.aborted) return;
      setErrors((current) => [
        ...current,
        {
          type: "error",
          index: 0,
          total: 0,
          releaseId: 0,
          movieTitle: "",
          message: err instanceof Error ? err.message : "Ошибка перепрогона",
        },
      ]);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="primary" onClick={() => void run()} loading={running}>
          Найти HDR10+
        </Button>
        {running ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => abortRef.current?.abort()}
          >
            Остановить
          </Button>
        ) : null}
        {running && total > 0 ? (
          <p className="font-mono-tech text-muted">
            {index} / {total}
            {currentTitle ? ` · ${currentTitle}` : ""}
          </p>
        ) : null}
      </div>

      {summary ? (
        <p className="text-sm text-muted">
          Проверено {summary.checked}, с HDR10+ {summary.found}, обновлено{" "}
          {summary.updated}, ошибок {summary.errors}.
        </p>
      ) : null}

      {found.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-mono-tech text-accent">нашли HDR10+</h2>
          <ul className="space-y-1.5">
            {found.map((item) => (
              <li key={item.releaseId} className="text-sm text-text">
                <Link
                  href={`/movies/${item.movieSlug}`}
                  className="text-accent hover:text-accent-bright"
                >
                  {item.movieTitle}
                </Link>
                <span className="text-muted">
                  {" "}
                  · {item.after.hdr ?? "—"}
                  {item.changed ? " · обновлён" : ""}
                </span>
                <span className="block font-mono-tech text-faint">
                  {item.fileName}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {errors.length > 0 ? (
        <section className="space-y-2">
          <h2 className="font-mono-tech text-danger">ошибки</h2>
          <ul className="space-y-1 text-sm text-danger">
            {errors.map((item, i) => (
              <li key={`${item.releaseId}-${i}`}>
                {item.movieTitle ? `${item.movieTitle}: ` : ""}
                {item.message}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
