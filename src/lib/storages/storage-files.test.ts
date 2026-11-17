import { expect, it } from "vitest";
import { buildStorageTree, sortStorageFiles } from "./storage-files";

it("sorts Russian titles naturally and keeps unknown sizes after all known sizes", () => {
  const files = [
    { id: 1, title: "Яма", fileSize: 0 },
    { id: 2, title: "Архив 10", fileSize: null },
    { id: 3, title: "Архив 2", fileSize: 100 },
    { id: 4, title: "Архив 1", fileSize: 100 },
  ].map(file => ({ ...file, folders: [], fileName: null, slug: String(file.id) }));
  expect(sortStorageFiles(files, "title", "ascending").map(file => file.id)).toEqual([4, 3, 2, 1]);
  expect(sortStorageFiles(files, "title", "descending").map(file => file.id)).toEqual([1, 2, 3, 4]);
  expect(sortStorageFiles(files, "size", "ascending").map(file => file.id)).toEqual([1, 4, 3, 2]);
  expect(sortStorageFiles(files, "size", "descending").map(file => file.id)).toEqual([4, 3, 1, 2]);
});

it("keeps root files, missing paths and repeated subfolder names distinct and totals descendants", () => {
  const locations = [
    { folders: ["Фильмы", "4K"], fileSize: 60 },
    { folders: ["Фильмы", "4K"], fileSize: null },
    { folders: ["Мультики", "4K"], fileSize: 90 },
    { folders: ["Без пути"], fileSize: 0 },
    { folders: null, fileSize: null },
    { folders: [], fileSize: 100 },
  ];
  const files = locations.map((location, id) => ({ ...location, id, title: String(id), slug: String(id), fileName: null }));
  const tree = buildStorageTree(files, "size", "descending");
  expect(tree).toMatchObject([
    { title: "Мультики", fileSize: 90, children: [{ title: "4K", children: [files[2]] }] },
    { title: "Фильмы", fileCount: 2, fileSize: 60, hasUnknownSize: true,
      children: [{ title: "4K", fileCount: 2, fileSize: 60, children: [files[0], files[1]] }] },
    { title: "Без пути", fileSize: 0, hasUnknownSize: false, children: [files[3]] },
    { title: "Без пути", fileSize: null, children: [files[4]] },
    files[5],
  ]);
});
