import { Library } from "lucide-react";
import { TagPill } from "@/components/primitives/TagPill";

interface MovieFranchisesProps {
  memberships: {
    id: number;
    franchise: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
}

export function MovieFranchises({ memberships }: MovieFranchisesProps) {
  if (memberships.length === 0) return null;
  return (
    <section>
      <h2 className="font-mono-tech mb-3 text-faint">входит во франшизы</h2>
      <ul className="flex flex-wrap gap-2">
        {memberships.map((membership) => (
          <li key={membership.id}>
            <TagPill
              href={`/franchises/${membership.franchise.slug}`}
              icon={<Library className="h-3.5 w-3.5 text-accent" aria-hidden />}
              className="py-1.5"
            >
              {membership.franchise.name}
            </TagPill>
          </li>
        ))}
      </ul>
    </section>
  );
}
