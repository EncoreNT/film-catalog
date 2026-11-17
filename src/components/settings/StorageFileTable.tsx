import Link from "next/link";
import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight, Folder, FolderOpen, List, ListTree } from "lucide-react";
import { SegmentedControl } from "@/components/primitives/SegmentedControl";
import { formatBytes } from "@/lib/shared/format-bytes";
import { buildStorageTree, sortStorageFiles, type StorageEntry, type StorageFile, type StorageSortColumn, type StorageSortDirection } from "@/lib/storages/storage-files";

const columns = { title: "Название", size: "Размер файла" } as const;

export function StorageFileTable({ files, storageName }: { files: StorageFile[]; storageName: string }) {
  const [sort, setSort] = useState<{ column: StorageSortColumn; direction: StorageSortDirection }>({
    column: "title", direction: "ascending",
  });
  const [view, setView] = useState<"tree" | "list">("tree");
  const [expanded, setExpanded] = useState(new Set<string>());
  const entries = useMemo(() => view === "tree"
    ? buildStorageTree(files, sort.column, sort.direction)
    : sortStorageFiles(files, sort.column, sort.direction), [files, sort, view]);

  function toggleFolder(id: string) {
    setExpanded(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function changeSort(column: StorageSortColumn) {
    const descending = sort.column === column ? sort.direction === "ascending" : column === "size";
    setSort({ column, direction: descending ? "descending" : "ascending" });
  }

  function renderRow(entry: StorageEntry, depth: number): ReactNode {
    const indent = { paddingInlineStart: `min(${depth * 18}px, 22%)` };
    const size = formatBytes(entry.fileSize, { unit: "binary" }) ?? "Неизвестен";
    if ("children" in entry) {
      const open = expanded.has(entry.id);
      const Icon = open ? FolderOpen : Folder;
      return (
        <Fragment key={entry.id}>
          <tr className="settings-storage-folder">
            <td style={indent}>
              <button type="button" className="focus-ring" aria-expanded={open} onClick={() => toggleFolder(entry.id)}>
                <ChevronRight size={13} aria-hidden className={open ? "rotate-90" : undefined} />
                <Icon size={16} aria-hidden className="text-accent" />
                <span>{entry.title}</span>
                <small aria-label={`Файлов: ${entry.fileCount}`}>{entry.fileCount}</small>
              </button>
            </td>
            <td className="font-mono-tech">
              {entry.hasUnknownSize && entry.fileSize !== null ? `≥ ${size}` : size}
            </td>
          </tr>
          {open && entry.children.map(child => renderRow(child, depth + 1))}
        </Fragment>
      );
    }
    return (
      <tr key={entry.id}>
        <td style={indent}>
          <Link href={`/movies/${entry.slug}`} prefetch={false} className="focus-ring hover:text-accent">{entry.title}</Link>
          <span className="settings-storage-filename" title={entry.fileName ?? undefined}>
            {entry.fileName ?? `Релиз №${entry.id}`}
          </span>
        </td>
        <td className="font-mono-tech">{size}</td>
      </tr>
    );
  }

  if (!files.length) return <p>На этом диске пока нет фильмов.</p>;
  return (
    <>
      <SegmentedControl value={view} onChange={setView} ariaLabel="Вид файлов" fullWidth={false} size="compact"
        options={[
          { value: "tree", label: "По папкам", icon: <ListTree size={14} aria-hidden /> },
          { value: "list", label: "Списком", icon: <List size={14} aria-hidden /> },
        ]}
      />
      <table aria-label={`Файлы на диске ${storageName}`}>
        <thead>
          <tr>
            {(["title", "size"] as const).map((column) => {
              const active = sort.column === column;
              const Icon = !active ? ArrowUpDown : sort.direction === "ascending" ? ArrowUp : ArrowDown;
              return (
                <th key={column} scope="col" aria-sort={active ? sort.direction : undefined}>
                  <button type="button" className="focus-ring" onClick={() => changeSort(column)}>
                    {column === "size" && view === "tree" ? "Размер" : columns[column]} <Icon size={14} aria-hidden />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>{entries.map(entry => renderRow(entry, 0))}</tbody>
      </table>
    </>
  );
}
