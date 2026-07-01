"use client";

import { GENRES } from "@/lib/dictionaries";
import { MultiSelect } from "./primitives/MultiSelect";

const GENRE_PICKER_HINT =
  "Можно выбрать несколько жанров. Перетащите теги, чтобы задать порядок важности — он сохранится и отобразится в каталоге.";

interface GenrePickerProps {
  value: string[];
  onChange: (value: string[]) => void;
  id?: string;
}

export function GenrePicker({ value, onChange, id }: GenrePickerProps) {
  return (
    <MultiSelect
      id={id}
      label="Жанры"
      value={value}
      onChange={onChange}
      options={GENRES}
      searchable
      reorderable
      hint={GENRE_PICKER_HINT}
    />
  );
}
