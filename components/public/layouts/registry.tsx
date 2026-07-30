import { classicLayout } from "./classic";
import { galleryLayout } from "./gallery";
import { splitLayout } from "./split";
import type { SiteLayoutModule } from "./types";
import type { SiteLayoutId } from "@/src/schemas/site-config";

export type {
  ChromeProps,
  HomeProps,
  NotFoundProps,
  SiteLayoutId,
  SiteLayoutModule,
} from "./types";

const LAYOUTS: Record<SiteLayoutId, SiteLayoutModule> = {
  split: splitLayout,
  classic: classicLayout,
  gallery: galleryLayout,
};

export function getLayout(id: SiteLayoutId | undefined | null): SiteLayoutModule {
  if (id && id in LAYOUTS) return LAYOUTS[id];
  return LAYOUTS.classic;
}
