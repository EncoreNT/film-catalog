import Link from "next/link";
import type { RemakeRole } from "@/generated/prisma/client";
import {
  RemakeRoleBadge,
  REMAKE_ROLE_PANEL_TONE,
} from "@/components/remakes/RemakeRoleBadge";
import {
  TooltipListHeader,
  TooltipListItem,
  TooltipListPanel,
} from "@/components/primitives/TooltipListParts";

interface MovieRemakesTooltipProps {
  role: RemakeRole;
  coMembers: {
    movieTitle: string;
    movieSlug: string;
    movieYear: number | null;
    role: RemakeRole;
  }[];
}

export function MovieRemakesTooltip({
  role,
  coMembers,
}: MovieRemakesTooltipProps) {
  return (
    <TooltipListPanel widthClass="w-[min(18rem,calc(100vw-2rem))]">
      <TooltipListHeader label="Связанные версии" count={coMembers.length + 1} />
      <div
        className={`mb-3 flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-l-2 px-2 py-1.5 ${REMAKE_ROLE_PANEL_TONE[role]}`}
      >
        <span className="font-mono-tech text-[0.55rem] uppercase tracking-wider text-faint">
          Этот фильм
        </span>
        <RemakeRoleBadge role={role} size="xs" />
      </div>
      {coMembers.length > 0 ? (
        <ul>
          <li
            aria-hidden
            className="font-mono-tech px-0.5 pb-1 text-[0.55rem] uppercase tracking-wider text-faint"
          >
            Перейти к
          </li>
          {coMembers.map((co) => (
            <TooltipListItem key={co.movieSlug}>
              <Link
                href={`/movies/${co.movieSlug}`}
                className="focus-ring flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-1 py-0.5 text-sm text-muted transition-colors hover:text-accent"
              >
                <span className="min-w-0 truncate">
                  {co.movieTitle}
                  {co.movieYear ? (
                    <span className="font-mono-tech ml-1 text-faint">
                      {co.movieYear}
                    </span>
                  ) : null}
                </span>
                <RemakeRoleBadge role={co.role} size="xs" />
              </Link>
            </TooltipListItem>
          ))}
        </ul>
      ) : null}
    </TooltipListPanel>
  );
}
