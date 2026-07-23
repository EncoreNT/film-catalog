"use client";

import { Unplug } from "lucide-react";
import { CatalogMark } from "@/components/shared/CatalogMark";

interface ExternalStorageMarkProps {
  storageNames: string[];
  className?: string;
}

/** Compact catalog mark: at least one release is on an external volume. */
export function ExternalStorageMark({
  storageNames,
  className = "",
}: ExternalStorageMarkProps) {
  const detail = storageNames.join(" · ");

  return (
    <CatalogMark
      icon={Unplug}
      label="Внешний диск"
      detail={detail || undefined}
      tone="accent"
      className={className}
    />
  );
}
