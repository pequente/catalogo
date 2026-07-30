import { getCachedProductBySlug } from "@/src/lib/cache/storefront-reads";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;
    const product = await getCachedProductBySlug(slug);
    if (!product) {
      throw new AppError("NOT_FOUND", "Produto não encontrado", 404);
    }
    return jsonOk(product);
  } catch (e) {
    return jsonError(e);
  }
}
