import { Suspense } from "react";
import { loadCatalogPage } from "@/lib/catalog/load-catalog-page";
import { MovieCatalog } from "@/components/catalog/MovieCatalog";
import { CatalogSkeleton } from "@/components/catalog/CatalogSkeleton";

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function CatalogContent({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const data = await loadCatalogPage(searchParams);
  return <MovieCatalog {...data} />;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolved = await searchParams;

  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CatalogContent searchParams={resolved} />
    </Suspense>
  );
}
