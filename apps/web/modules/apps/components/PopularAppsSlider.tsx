import { useLocale } from "@calcom/lib/hooks/useLocale";
import type { AppFrontendPayload as App } from "@calcom/types/App";
import { AppCard } from "./AppCard";
import { Slider } from "./Slider";

const MAX_FEATURED_APPS = 10;

export const PopularAppsSlider = <T extends App>({ items }: { items: T[] }): JSX.Element => {
  const { t } = useLocale();
  const popularApps = [...items]
    .sort((a, b) => (b.installCount || 0) - (a.installCount || 0))
    .slice(0, MAX_FEATURED_APPS);

  return (
    <Slider<T>
      title={t("most_popular")}
      items={popularApps}
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
