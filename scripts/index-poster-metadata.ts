import { posterMetadataStore } from "../src/lib/covers/poster-metadata";

// Reads image headers and writes only data/covers/poster-metadata.json. No DB access.
posterMetadataStore.refresh(true).then((index) => {
  const entries = Object.values(index.files);
  console.log(`Обложек: ${entries.length}; прочитано: ${entries.filter((item) => item.status === "ready").length}; не удалось прочитать: ${entries.filter((item) => item.status === "unreadable").length}.`);
  console.log("Метаданные сохранены в data/covers/poster-metadata.json");
}).catch((error) => {
  console.error("Не удалось заполнить метаданные постеров:", error);
  process.exitCode = 1;
});
