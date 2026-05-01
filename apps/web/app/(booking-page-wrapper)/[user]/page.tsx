import { WEBAPP_URL } from "@calcom/lib/constants";
import { type buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { createCachedLegacyPageData } from "app/legacyPageDataCache";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import type { PageProps as LegacyPageProps } from "~/users/views/users-public-view";
import LegacyPage from "~/users/views/users-public-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

const getPageData: (pageProps: PageProps) => Promise<LegacyPageProps> = createCachedLegacyPageData(getData);

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const props = await getPageData({ params, searchParams });

  return <LegacyPage {...props} />;
};

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const props = await getPageData({ params, searchParams });

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
