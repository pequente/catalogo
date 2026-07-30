import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { jsonError, jsonOk } from "@/src/lib/api/response";

export async function GET() {
  try {
    return jsonOk(await getCachedSiteConfig());
  } catch (e) {
    return jsonError(e);
  }
}
