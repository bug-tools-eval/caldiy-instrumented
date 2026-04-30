import process from "node:process";
import { loadTranslations } from "@calcom/i18n/server";
import { BookingStatus } from "@calcom/prisma/enums";
import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import type { PageProps as _PageProps } from "app/_types";
import { _generateMetadata } from "app/_utils";
import { CustomI18nProvider } from "app/CustomI18nProvider";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import OldPage from "~/bookings/views/bookings-single-view";
import {
  type PageProps as ClientPageProps,
  getServerSideProps,
} from "~/bookings/views/bookings-single-view.getServerSideProps";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<ClientPageProps> =
  withAppDirSsr<ClientPageProps>(getServerSideProps);

const getCachedData: (serializedParams: string, serializedSearchParams: string) => Promise<ClientPageProps> =
  cache(async (serializedParams: string, serializedSearchParams: string): Promise<ClientPageProps> => {
    const params = JSON.parse(serializedParams) as Awaited<_PageProps["params"]>;
    const searchParams = JSON.parse(serializedSearchParams) as Awaited<_PageProps["searchParams"]>;
    const legacyCtx = buildLegacyCtx(await headers(), await cookies(), params, searchParams);

    return getData(legacyCtx);
  });

const getPageProps = async ({ params, searchParams }: _PageProps): Promise<ClientPageProps> => {
  const serializedParams = JSON.stringify(await params);
  const serializedSearchParams = JSON.stringify(await searchParams);

  return getCachedData(serializedParams, serializedSearchParams);
};

const generateMetadata = async ({ params, searchParams }: _PageProps): Promise<Metadata> => {
  const { bookingInfo, eventType, recurringBookings } = await getPageProps({ params, searchParams });
  const needsConfirmation = bookingInfo.status === BookingStatus.PENDING && eventType.requiresConfirmation;

  const metadata = await _generateMetadata(
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    (t) =>
      t(`booking_${needsConfirmation ? "submitted" : "confirmed"}${recurringBookings ? "_recurring" : ""}`),
    false,
    process.env.NEXT_PUBLIC_WEBAPP_URL ?? "",
    `/booking/${(await params).uid}`
  );

  return {
    ...metadata,
    robots: {
      index: false,
      follow: false,
    },
  };
};

const ServerPage = async ({ params, searchParams }: _PageProps): Promise<JSX.Element> => {
  const props = await getPageProps({ params, searchParams });

  const eventLocale = props.eventType?.interfaceLanguage;
  if (eventLocale) {
    const ns = "common";
    const translations = await loadTranslations(eventLocale, ns);
    return (
      <CustomI18nProvider translations={translations} locale={eventLocale} ns={ns}>
        <OldPage {...props} />
      </CustomI18nProvider>
    );
  }

  return <OldPage {...props} />;
};

export { generateMetadata };
export default ServerPage;
