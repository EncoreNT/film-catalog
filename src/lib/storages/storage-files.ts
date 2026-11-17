export interface StorageFile {
  id: number;
  title: string;
  slug: string;
  fileName: string | null;
  fileSize: number | null;
  /** Relative directory segments. Null means the release has no recorded path. */
  folders: string[] | null;
}

export interface StorageFolder {
  id: string;
  title: string;
  children: StorageEntry[];
  fileSize: number | null;
  hasUnknownSize: boolean;
  fileCount: number;
}

export type StorageEntry = StorageFile | StorageFolder;
export type StorageSortColumn = "title" | "size";
export type StorageSortDirection = "ascending" | "descending";

const collator = new Intl.Collator("ru", { numeric: true, sensitivity: "base" });

function compareEntries(a: StorageEntry, b: StorageEntry, column: StorageSortColumn, direction: StorageSortDirection) {
  const sign = direction === "ascending" ? 1 : -1;
  if (column === "size") {
    if (a.fileSize === null && b.fileSize !== null) return 1;
    if (b.fileSize === null && a.fileSize !== null) return -1;
    if (a.fileSize !== null && b.fileSize !== null && a.fileSize !== b.fileSize) {
      return (a.fileSize - b.fileSize) * sign;
    }
  }
  const byTitle = collator.compare(a.title, b.title);
  if (byTitle || "children" in a || "children" in b) return column === "title" ? sign * byTitle : byTitle;
  return collator.compare(a.fileName ?? "", b.fileName ?? "") || a.id - b.id;
}

export function sortStorageFiles(files: StorageFile[], column: StorageSortColumn, direction: StorageSortDirection) {
  return [...files].sort((a, b) => compareEntries(a, b, column, direction));
}

export function buildStorageTree(files: StorageFile[], column: StorageSortColumn, direction: StorageSortDirection) {
  const root: StorageEntry[] = [];
  const folders = new Map<string, StorageFolder>();
  for (const file of files) {
    let children = root;
    let key = "";
    for (const segment of file.folders ?? [null]) {
      key = segment === null ? "unknown" : `${key}/${segment}`;
      let folder = folders.get(key);
      if (!folder) {
        folder = { id: key, title: segment ?? "Без пути", children: [], fileSize: null, hasUnknownSize: false, fileCount: 0 };
        folders.set(key, folder);
        children.push(folder);
      }
      folder.fileCount++;
      if (file.fileSize === null) folder.hasUnknownSize = true;
      else folder.fileSize = (folder.fileSize ?? 0) + file.fileSize;
      children = folder.children;
    }
    children.push(file);
  }

  const compare = (a: StorageEntry, b: StorageEntry) => {
    const foldersFirst = Number("children" in b) - Number("children" in a);
    return foldersFirst || compareEntries(a, b, column, direction);
  };
  for (const folder of folders.values()) folder.children.sort(compare);
  return root.sort(compare);
}
