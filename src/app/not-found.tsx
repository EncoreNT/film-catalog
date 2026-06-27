import type { Metadata } from "next";
import { ErrorScene } from "@/components/ErrorScene";

export const metadata: Metadata = {
  title: "Сеанс не найдён",
  description: "Запрошенной страницы нет в архиве Кинозала.",
};

export default function NotFound() {
  return (
    <ErrorScene
      code="404"
      eyebrow="плёнка оборвана"
      title={
        <>
          Такого <em className="text-accent not-italic">сеанса</em> нет в архиве
        </>
      }
      description="Похоже, кадр утерян или перемотан не туда. Загляните в каталог — там все фильмы на своих полках."
    />
  );
}
