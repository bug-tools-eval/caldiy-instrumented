import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import {
  type PageProps as ClientPageProps,
  getServerSideProps,
} from "@lib/d/[link]/[slug]/getServerSideProps";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import Type from "~/d/[link]/d-type-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<ClientPageProps> =
  withAppDirSsr<ClientPageProps>(getServerSideProps);

const getCachedData: (serializedParams: string, serializedSearchParams: string) => Promise<ClientPageProps> =
  cache(async (serializedParams: string, serializedSearchParams: string): Promise<ClientPageProps> => {
    const params = JSON.parse(serializedParams) as Awaited<_PageProps["params"]>;
    const searchParams = JSON.parse(serializedSearchParams) as Awaited<_PageProps["searchParams"]>;
    const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, searchParams);

    return getData(legacyCtx);
  });

const getPageProps = async ({
  params,
  searchParams,
}: _PageProps): Promise<{ pageProps: ClientPageProps; params: Awaited<_PageProps["params"]> }> => {
  const resolvedParams = await params;
  const serializedParams = JSON.stringify(resolvedParams);
  const serializedSearchParams = JSON.stringify(await searchParams);

  return {
    pageProps: await getCachedData(serializedParams, serializedSearchParams),
    params: resolvedParams,
  };
};

const generateMetadata = async ({ params, searchParams }: _PageProps): Promise<Metadata> => {
  const { pageProps, params: resolvedParams } = await getPageProps({ params, searchParams });

  const { booking, eventData, isBrandingHidden } = pageProps;
  const rescheduleUid = booking?.uid;

  const profileName = eventData?.profile?.name ?? "";
  const title = eventData?.title ?? "";
  return await _generateMetadata(
    (t) => `${rescheduleUid && !!booking ? t("reschedule") : ""} ${title} | ${profileName}`,
    (t) => `${rescheduleUid ? t("reschedule") : ""} ${title}`,
    isBrandingHidden,
    undefined,
    `/d/${resolvedParams.link}/${resolvedParams.slug}`
  );
};

const ServerPage = async ({ params, searchParams }: _PageProps): Promise<JSX.Element> => {
  const { pageProps } = await getPageProps({ params, searchParams });

  return <Type {...pageProps} />;
};

export { generateMetadata };
export default ServerPage;
