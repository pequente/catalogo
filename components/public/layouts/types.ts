import type { ReactNode } from "react";
import type { Banner } from "@/src/schemas/banner";
import type { Category } from "@/src/schemas/category";
import type { ProductListItem } from "@/src/schemas/product-list";
import type { SiteConfig, SiteLayoutId } from "@/src/schemas/site-config";

export type { SiteLayoutId };

export type ChromeProps = {
  site: SiteConfig;
  categories: Category[];
};

export type HomeProps = {
  site: SiteConfig;
  categories: Category[];
  banners: Banner[];
  destaques: ProductListItem[];
  novos: ProductListItem[];
  /** Public products shown when both destaques and novos are empty. */
  vitrineFallback: ProductListItem[];
  wa: string;
};

export type NotFoundProps = {
  site: SiteConfig;
};

export type SiteLayoutModule = {
  id: SiteLayoutId;
  Header: (props: ChromeProps) => ReactNode;
  Footer: (props: ChromeProps) => ReactNode;
  Home: (props: HomeProps) => ReactNode;
  NotFound: (props: NotFoundProps) => ReactNode;
};
