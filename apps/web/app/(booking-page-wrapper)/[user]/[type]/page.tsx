import { loadTranslations } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/[type]/getServerSideProps";
import type { PageProps, Params, ReadonlyHeaders, ReadonlyRequestCookies, SearchParams } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { PageProps as LegacyPageProps } from "~/users/views/users-type-public-view";
import LegacyPage from "~/users/views/users-type-public-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

type HeaderEntry = [string, string];
type CookieEntry = { name: string; value: string };
type CacheableObject = Params | SearchParams;
type CacheableObjectEntry = [string, string | string[] | null];

const getObjectCacheKey = (object: CacheableObject): string =>
  JSON.stringify(Object.entries(object).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));

const objectFromCacheKey = <T extends CacheableObject>(cacheKey: string): T =>
  Object.fromEntries(
    (JSON.parse(cacheKey) as CacheableObjectEntry[]).map(([key, value]) => [
      key,
      value === null ? undefined : value,
    ])
  ) as T;

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

const getCachedData: (
  headersCacheKey: string,
  cookiesCacheKey: string,
  paramsCacheKey: string,
  searchParamsCacheKey: string
) => Promise<LegacyPageProps> = cache(
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

const getPageData = async ({ params, searchParams }: PageProps): Promise<LegacyPageProps> => {
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

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const props = await getPageData({ params, searchParams });

  const locale = props.eventData?.interfaceLanguage;
  if (locale) {
    const ns = "common";
    const translations = await loadTranslations(locale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={locale} ns={ns}>
        <LegacyPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const props = await getPageData({ params, searchParams });

  const { booking, isSEOIndexable = true, eventData, isBrandingHidden } = props;
  const rescheduleUid = booking?.uid;
  const profileName = eventData?.profile?.name ?? "";
  const title = eventData?.title ?? "";
  const meeting = {
    title,
    profile: { name: profileName, image: eventData?.profile.image },
    users:
      eventData?.subsetOfUsers.map((user) => ({
        name: `${user.name}`,
        username: `${user.username}`,
      })) || [],
  };
  const decodedParams = decodeParams(await params);
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    WEBAPP_URL,
    `/${decodedParams.user}/${decodedParams.type}`
  );

  return {
    ...metadata,
    robots: {
      follow: !(eventData?.hidden || !isSEOIndexable),
      index: !(eventData?.hidden || !isSEOIndexable),
    },
  };
};

export default ServerPage;
