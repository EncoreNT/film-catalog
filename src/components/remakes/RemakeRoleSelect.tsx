"use client";

import { Select } from "@/components/primitives/Select";
import type { RemakeRole } from "@/generated/prisma/client";
import { REMAKE_ROLES } from "@/lib/shared/dictionaries";

interface RemakeRoleSelectProps {
  value: RemakeRole;
  onChange: (role: RemakeRole) => void;
  disabled?: boolean;
  id?: string;
  /** Компактный триггер без строки label — для строк списка. */
  compact?: boolean;
  label?: string;
}

export function RemakeRoleSelect({
  value,
  onChange,
  disabled = false,
  id,
  compact = true,
  label = "Роль",
}: RemakeRoleSelectProps) {
  return (
    <Select
      id={id}
      label={label}
      compact={compact}
      preserveOrder
      disabled={disabled}
      value={value}
      onChange={(next) => onChange(next as RemakeRole)}
      options={REMAKE_ROLES}
    />
  );
}
