import Link from "next/link";
import { ArrowUpRight, Library } from "lucide-react";

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
    <section className="movie-franchises">
      <h2><Library size={15} aria-hidden /> Франшизы</h2>
      <ul>
        {memberships.map((membership) => (
          <li key={membership.id}>
            <Link className="focus-ring" href={`/franchises/${membership.franchise.slug}`}>
              {membership.franchise.name}<ArrowUpRight size={14} aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
