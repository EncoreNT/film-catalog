import { remakeGroupListQuerySchema } from "@/lib/api/validators";

export function parseRemakeGroupListQuery(
  searchParams: URLSearchParams,
) {
  const raw = Object.fromEntries(searchParams.entries());
  return remakeGroupListQuerySchema.parse(raw);
}
