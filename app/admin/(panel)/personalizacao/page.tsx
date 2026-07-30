import { PersonalizacaoClient } from "@/components/admin/PersonalizacaoClient";
import {
  getCachedActiveCategories,
  getCachedAllBanners,
} from "@/src/lib/cache/storefront-reads";
import { getSiteConfigTab } from "@/src/services/site-config.service";
import { parseConfigTab } from "@/components/admin/configuracoes/configTabs";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import { mergeTabIntoConfig } from "@/src/schemas/site-config-tabs";
import type { Banner } from "@/src/schemas/banner";
import type { Category } from "@/src/schemas/category";
import type { SiteConfig } from "@/src/schemas/site-config";

type Props = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function AdminPersonalizacaoPage({ searchParams }: Props) {
  const params = await searchParams;
  const tabParam = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const initialTab = parseConfigTab(tabParam);

  let initialConfig: SiteConfig = {
    ...DEFAULT_SITE_CONFIG,
  };
  let initialBanners: Banner[] = [];
  let initialCategories: Category[] = [];

  try {
    const tabResponse = await getSiteConfigTab(initialTab);
    initialConfig = mergeTabIntoConfig(
      {
        ...DEFAULT_SITE_CONFIG,
        versao: tabResponse.versao,
        atualizadoEm: tabResponse.atualizadoEm,
      },
      initialTab,
      tabResponse.data,
    );

    if (initialTab === "vitrine") {
      try {
        initialBanners = await getCachedAllBanners();
      } catch (e) {
        console.error("[personalizacao] banners unavailable", e);
      }
    }
    if (initialTab === "vitrine" || initialTab === "navegacao") {
      try {
        initialCategories = await getCachedActiveCategories();
      } catch (e) {
        console.error("[personalizacao] categories unavailable", e);
      }
    }
  } catch (e) {
    console.error("[personalizacao] config unavailable, using defaults", e);
  }

  return (
    <PersonalizacaoClient
      initialConfig={initialConfig}
      initialTab={initialTab}
      initialLoadedTabs={[initialTab]}
      initialBanners={initialBanners}
      initialCategories={initialCategories}
    />
  );
}
