import { formatFileSizeGB } from "@/lib/shared/format";

/** Progress line: «12.34 ГБ / 45.67 ГБ». */
export function mediaJobProgressMessage(
  bytesCopied: number,
  totalBytes: number,
): string {
  const copied = formatFileSizeGB(bytesCopied) ?? "0 ГБ";
  const total = formatFileSizeGB(totalBytes) ?? "—";
  return `${copied} / ${total}`;
}
