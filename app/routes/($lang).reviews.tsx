import {
  defer,
  type LoaderArgs,
  type SerializeFrom,
} from '@shopify/remix-oxygen';
import {flattenConnection} from '@shopify/hydrogen';
import {Await, Form, useLoaderData} from '@remix-run/react';
import type {
  Collection,
  CollectionConnection,
  Product,
  ProductConnection,
} from '@shopify/hydrogen/storefront-api-types';
import {Suspense} from 'react';
import invariant from 'tiny-invariant';
import {
  Heading,
  Input,
  PageHeader,
  ProductGrid,
  ProductSwimlane,
  FeaturedCollections,
  Section,
  Text,
} from '~/components';
import {PRODUCT_CARD_FRAGMENT} from '~/data/fragments';
import {PAGINATION_SIZE} from '~/lib/const';
import {seoPayload} from '~/lib/seo.server';

export async function loader({request, context: {storefront}}: LoaderArgs) {
  const searchParams = new URL(request.url).searchParams;
  const cursor = searchParams.get('cursor')!;
  const searchTerm = searchParams.get('q')!;

  const data = await storefront.query<{
    products: ProductConnection;
  }>(SEARCH_QUERY, {
    variables: {
      pageBy: PAGINATION_SIZE,
      searchTerm,
      cursor,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');
  const {products} = data;

  const getRecommendations = !searchTerm || products?.nodes?.length === 0;
  const seoCollection = {
    id: 'search',
    title: 'Search',
    handle: 'search',
    descriptionHtml: 'Search results',
    description: 'Search results',
    seo: {
      title: 'Search',
      description: `Showing ${products.nodes.length} search results for "${searchTerm}"`,
    },
    metafields: [],
    products,
    updatedAt: new Date().toISOString(),
  } satisfies Collection;

  const seo = seoPayload.collection({
    collection: seoCollection,
    url: request.url,
  });

  return defer({
    seo,
    searchTerm,
    products,
    noResultRecommendations: getRecommendations
      ? getNoResultRecommendations(storefront)
      : Promise.resolve(null),
  });
}

export default function Search() {
  const {searchTerm, products, noResultRecommendations} =
    useLoaderData<typeof loader>();
  const noResults = products?.nodes?.length === 0;

  return (
    <>
      <PageHeader>
        <Heading as="h1" size="copy">
          All Reviews
        </Heading>
        
      </PageHeader>
      <Section>
        <div className="jdgm-widget jdgm-all-reviews-widget">  <div className="jdgm-all-reviews__body"></div></div>
      </Section>
    </>
  );
}

const SEARCH_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query search(
    $searchTerm: String
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
    $after: String
  ) @inContext(country: $country, language: $language) {
    products(
      first: $pageBy
      sortKey: RELEVANCE
      query: $searchTerm
      after: $after
    ) {
      nodes {
        ...ProductCard
      }
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
    }
  }
`;

export async function getNoResultRecommendations(
  storefront: LoaderArgs['context']['storefront'],
) {
  const data = await storefront.query<{
    featuredCollections: CollectionConnection;
    featuredProducts: ProductConnection;
  }>(SEARCH_NO_RESULTS_QUERY, {
    variables: {
      pageBy: PAGINATION_SIZE,
      country: storefront.i18n.country,
      language: storefront.i18n.language,
    },
  });

  invariant(data, 'No data returned from Shopify API');

  return {
    featuredCollections: flattenConnection(data.featuredCollections),
    featuredProducts: flattenConnection(data.featuredProducts),
  };
}

const SEARCH_NO_RESULTS_QUERY = `#graphql
  ${PRODUCT_CARD_FRAGMENT}
  query searchNoResult(
    $country: CountryCode
    $language: LanguageCode
    $pageBy: Int!
  ) @inContext(country: $country, language: $language) {
    featuredCollections: collections(first: 3, sortKey: UPDATED_AT) {
      nodes {
        id
        title
        handle
        image {
          altText
          width
          height
          url
        }
      }
    }
    featuredProducts: products(first: $pageBy) {
      nodes {
        ...ProductCard
      }
    }
  }
`;
