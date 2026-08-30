import type { Metadata } from "next";
import { EntityEditLayout } from "@/components/layout/EntityEditLayout";
import { AddMovieForm } from "@/components/movies/AddMovieForm";

export const metadata: Metadata = {
  title: "Добавить фильм",
};

export default function NewMoviePage() {
  return (
    <EntityEditLayout
      backHref="/"
      backLabel="Назад к каталогу"
      eyebrow="карточка фильма"
      title="Добавить фильм"
      fillViewport
    >
      <AddMovieForm />
    </EntityEditLayout>
  );
}
