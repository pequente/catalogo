import { siteIconResponse } from "@/src/lib/front/site-icon";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export default async function Icon() {
  return siteIconResponse(size);
}
