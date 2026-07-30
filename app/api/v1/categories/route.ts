import { getCachedActiveCategories } from "@/src/lib/cache/storefront-reads";
import { jsonError, jsonOk } from "@/src/lib/api/response";

export async function GET() {
  try {
    return jsonOk({ items: await getCachedActiveCategories() });
  } catch (e) {
    return jsonError(e);
  }
}
