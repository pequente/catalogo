export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  banners: "banners",
  siteConfig: "site-config",
  dashboard: "dashboard",
  clients: "clients",
  orders: "orders",
  media: "media",
  analytics: "analytics",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];
