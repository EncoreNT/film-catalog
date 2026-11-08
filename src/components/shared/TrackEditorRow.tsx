"use client";

import { ChevronDown, Star } from "lucide-react";
import { useState, type ReactNode } from "react";

/** A readable track inventory with editing kept beside its summary. */
export function TrackEditorRow({
  title,
  language,
  description,
  primary,
  initialOpen,
  children,
}: {
  title: string;
  language: string;
  description: string;
  primary: boolean;
  initialOpen: boolean;
  children: ReactNode;
}) {
  const [startOpen] = useState(initialOpen);
  return (
    <details className="track-editor-row" open={startOpen}>
      <summary>
        <span className="track-editor-language">
          {language || "Язык не указан"}
        </span>
        <span className="track-editor-summary">
          <strong>{title}</strong>
          <small>{description || "Укажите параметры дорожки"}</small>
        </span>
        {primary && (
          <span className="track-editor-primary">
            <Star size={13} aria-hidden />
            Основная
          </span>
        )}
        <ChevronDown className="track-editor-chevron" size={17} aria-hidden />
      </summary>
      <div className="track-editor-fields">{children}</div>
    </details>
  );
}
