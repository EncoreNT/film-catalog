"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { SerializedBuild } from "@/lib/builds/build-serialize";
import { BuildJobCard } from "@/components/builds/BuildJobCard";

export function BuildsPageClient({
  initialItems,
  movieId,
}: {
  initialItems: SerializedBuild[];
  movieId?: number;
}) {
  const [items, setItems] = useState(initialItems);

  useEffect(() => {
    const timer = setInterval(() => {
      const query = new URLSearchParams();
      if (movieId) query.set("movieId", String(movieId));
      query.set("limit", "50");
      void apiFetch<{ items: SerializedBuild[] }>(
        `/api/builds?${query.toString()}`,
        undefined,
        "Ошибка загрузки",
      )
        .then((data) => setItems(data.items))
        .catch(() => undefined);
    }, 5000);
    return () => clearInterval(timer);
  }, [movieId]);

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="text-sm text-muted">Сборок пока нет.</p>
      ) : (
        items.map((build) => <BuildJobCard key={build.id} build={build} />)
      )}
      <Link href="/" className="text-sm text-accent hover:underline">
        В каталог
      </Link>
    </div>
  );
}
