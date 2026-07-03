"use client";

import { useEffect } from "react";
import { ErrorScene } from "@/components/layout/ErrorScene";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <ErrorScene
      code="500"
      eyebrow="зажало плёнку"
      title={
        <>
          Внутри <em className="text-accent not-italic">проектора</em> что-то заклинило
        </>
      }
      description="Рендер кадра сорвался на полпути. Перемотайте плёнку и попробуйте ещё раз — иногда помогает."
      retryLabel="Перемотать и заново"
      onRetry={unstable_retry}
    />
  );
}
