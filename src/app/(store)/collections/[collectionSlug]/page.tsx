import SectionHeading from "@/components/layouts/SectionHeading";
import { Shell } from "@/components/layouts/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { CollectionBanner } from "@/features/collections";
import { SearchProductsGridSkeleton } from "@/features/products";
import {
  FilterSelections,
  SearchProductsInifiteScroll,
} from "@/features/search";
import { STOREFRONT_REVALIDATE_SECONDS } from "@/lib/cache/constants";
import { withFallback } from "@/lib/resilience";
import { getCollectionPageCached } from "@/lib/storefront/collection-detail";
import { getDraftProductIdsSafe } from "@/lib/storefront/draft-product-ids";
import { fetchProductSearchCached } from "@/lib/storefront/product-queries";
import { buildShopSearchVariables } from "@/lib/storefront/search-params";
import { toTitleCase, unslugify } from "@/lib/utils";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const revalidate = STOREFRONT_REVALIDATE_SECONDS;

interface CategoryPageProps {
  params: {
    collectionSlug: string;
  };
  searchParams: {
    [key: string]: string | string[] | undefined;
  };
}

export function generateMetadata({ params }: CategoryPageProps) {
  const collectionName = toTitleCase(unslugify(params.collectionSlug));
  const path = `/collections/${params.collectionSlug}`;

  return {
    title: `${collectionName} Sarees`,
    description: `Shop ${collectionName} sarees at Sakthi Textile. Premium silk and cotton sarees with secure online ordering.`,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${collectionName} Sarees | Sakthi Textile`,
      description: `Shop ${collectionName} sarees at Sakthi Textile.`,
      url: path,
    },
  };
}

async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const requestedSlug = decodeURIComponent(params.collectionSlug).trim();
  const data = await getCollectionPageCached(requestedSlug);
  const collection = data?.collectionsCollection?.edges?.[0]?.node;

  if (!collection?.id) return notFound();

  if (requestedSlug !== collection.slug) {
    redirect(`/collections/${encodeURIComponent(collection.slug)}`);
  }

  const variables = buildShopSearchVariables(searchParams, collection.id);
  const [initialSearchResult, initialDraftIds] = await Promise.all([
    withFallback(
      "collection:search",
      () => fetchProductSearchCached(variables),
      { productsCollection: null, matchingCollections: [] },
    ),
    getDraftProductIdsSafe(),
  ]);

  return (
    <Shell>
      <CollectionBanner collectionBannerData={collection} />
      <SectionHeading
        heading={collection.label}
        description={collection.description}
      />

      <Suspense
        fallback={
          <div>
            <Skeleton className="max-w-xl h-8 mb-3" />
            <Skeleton className="max-w-2xl h-8" />
          </div>
        }
      >
        <FilterSelections shopLayout={false} />
      </Suspense>

      <Suspense fallback={<SearchProductsGridSkeleton />}>
        <SearchProductsInifiteScroll
          collectionId={collection.id}
          initialSearchResult={initialSearchResult}
          initialDraftIds={initialDraftIds ?? undefined}
        />
      </Suspense>
    </Shell>
  );
}

export default CategoryPage;
