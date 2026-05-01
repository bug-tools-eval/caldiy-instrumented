import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import { AppCard } from "./AppCard";
import { Slider } from "./Slider";

const MAX_FEATURED_APPS = 10;

export const RecentAppsSlider = <T extends App>({ items }: { items: T[] }): JSX.Element => {
  const { t } = useLocale();
  const recentApps = [...items]
    .sort((a, b) => new Date(b?.createdAt || 0).valueOf() - new Date(a?.createdAt || 0).valueOf())
    .slice(0, MAX_FEATURED_APPS);

  return (
    <Slider<T>
      title={t("recently_added")}
      items={recentApps}
      itemKey={(app: T): string => app.name}
      options={{
        perView: 3,
        breakpoints: {
          768 /* and below */: {
            perView: 1,
          },
        },
      }}
      renderItem={(app: T): JSX.Element => <AppCard app={app} />}
    />
  );
};
