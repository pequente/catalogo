import { siteIconResponse } from "@/src/lib/front/site-icon";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export default async function AppleIcon() {
  return siteIconResponse(size);
}
