import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps, Params, ReadonlyHeaders, ReadonlyRequestCookies, SearchParams } from "app/_types";
import { cookies, headers } from "next/headers";
import { cache } from "react";

type HeaderEntry = [string, string];
type CookieEntry = { name: string; value: string };
type CacheableObject = Params | SearchParams;
type CacheableObjectEntry = [string, string | string[] | null];
type LegacyPageDataLoader<TPageProps> = (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<TPageProps>;
type CachedLegacyPageData<TPageProps> = (pageProps: PageProps) => Promise<TPageProps>;

const getObjectCacheKey = (object: CacheableObject): string =>
  JSON.stringify(Object.entries(object).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));

const objectFromCacheKey = <TObject extends CacheableObject>(cacheKey: string): TObject =>
  Object.fromEntries(
    (JSON.parse(cacheKey) as CacheableObjectEntry[]).map(([key, value]) => {
      if (value === null) return [key, undefined];

      return [key, value];
    })
  ) as TObject;

const getHeadersCacheKey = (headersList: ReadonlyHeaders): string =>
  JSON.stringify(Array.from(headersList.entries()).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));

const headersFromCacheKey = (cacheKey: string): ReadonlyHeaders =>
  new Map(JSON.parse(cacheKey) as HeaderEntry[]) as unknown as ReadonlyHeaders;

const getCookiesCacheKey = (cookiesList: ReadonlyRequestCookies): string =>
  JSON.stringify(
    cookiesList
      .getAll()
      .map(({ name, value }) => ({ name, value }))
      .sort((cookieA, cookieB) => {
        const nameComparison = cookieA.name.localeCompare(cookieB.name);
        return nameComparison || cookieA.value.localeCompare(cookieB.value);
      })
  );

const cookiesFromCacheKey = (cacheKey: string): ReadonlyRequestCookies =>
  ({
    getAll: () => JSON.parse(cacheKey) as CookieEntry[],
  }) as unknown as ReadonlyRequestCookies;

export const createCachedLegacyPageData = <TPageProps>(
  getData: LegacyPageDataLoader<TPageProps>
): CachedLegacyPageData<TPageProps> => {
  const getCachedData: (
    headersCacheKey: string,
    cookiesCacheKey: string,
    paramsCacheKey: string,
    searchParamsCacheKey: string
  ) => Promise<TPageProps> = cache(
    async (
      headersCacheKey: string,
      cookiesCacheKey: string,
      paramsCacheKey: string,
      searchParamsCacheKey: string
    ) => {
      return await getData(
        buildLegacyCtx(
          headersFromCacheKey(headersCacheKey),
          cookiesFromCacheKey(cookiesCacheKey),
          objectFromCacheKey<Params>(paramsCacheKey),
          objectFromCacheKey<SearchParams>(searchParamsCacheKey)
        )
      );
    }
  );

  return async ({ params, searchParams }: PageProps): Promise<TPageProps> => {
    const [headersList, cookiesList, resolvedParams, resolvedSearchParams] = await Promise.all([
      headers(),
      cookies(),
      params,
      searchParams,
    ]);

    return await getCachedData(
      getHeadersCacheKey(headersList),
      getCookiesCacheKey(cookiesList),
      getObjectCacheKey(resolvedParams),
      getObjectCacheKey(resolvedSearchParams)
    );
  };
};
