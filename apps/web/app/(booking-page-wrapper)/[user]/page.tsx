import { WEBAPP_URL } from "@calcom/lib/constants";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

const getCachedData: (serializedParams: string, serializedSearchParams: string) => Promise<LegacyPageProps> =
  cache(async (serializedParams: string, serializedSearchParams: string): Promise<LegacyPageProps> => {
    const params = JSON.parse(serializedParams) as Awaited<PageProps["params"]>;
    const searchParams = JSON.parse(serializedSearchParams) as Awaited<PageProps["searchParams"]>;
    const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, searchParams);

    return getData(legacyCtx);
  });

const getPageProps = async ({ params, searchParams }: PageProps): Promise<LegacyPageProps> => {
  const serializedParams = JSON.stringify(await params);
  const serializedSearchParams = JSON.stringify(await searchParams);

  return getCachedData(serializedParams, serializedSearchParams);
};

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const props = await getPageProps({ params, searchParams });

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const props = await getPageProps({ params, searchParams });

  const { profile, markdownStrippedBio, isOrgSEOIndexable } = props;
  const isOrg = !!profile?.organization;
  const allowSEOIndexing =
    (!isOrg && profile.allowSEOIndexing) || (isOrg && isOrgSEOIndexable && profile.allowSEOIndexing);

  const meeting = {
    title: markdownStrippedBio,
    profile: { name: `${profile.name}`, image: profile.image },
    users: [{ username: `${profile.username}`, name: `${profile.name}` }],
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    () => profile.name,
    () => markdownStrippedBio,
    false,
    WEBAPP_URL,
    `/${decodeParams(await params).user}`
  );

  return {
    ...metadata,
    robots: {
      follow: allowSEOIndexing,
      index: allowSEOIndexing,
    },
  };
};

export default ServerPage;
