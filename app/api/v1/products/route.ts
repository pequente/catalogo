import { NextRequest } from "next/server";
import {
  listCachedProductListItems,
  resolveCategoryFilterIds,
} from "@/src/lib/cache/storefront-reads";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { normalizePagination, PAGINATION } from "@/src/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const categoriaParam = sp.get("categoria") ?? undefined;
    let categoriaIds: string[] | undefined;
    if (categoriaParam) {
      const resolved = await resolveCategoryFilterIds(categoriaParam);
      categoriaIds = resolved ?? [];
    }

    const { page, pageSize } = normalizePagination(
      {
        page: sp.get("page"),
        pageSize: sp.get("pageSize"),
      },
      { defaultPageSize: PAGINATION.PUBLIC_DEFAULT_PAGE_SIZE },
    );

    // Lean DTO page — still O(N) I/O until Fase 2 index (marked in storefront-reads).
    const result = await listCachedProductListItems({
      publicOnly: true,
      categoriaIds,
      tamanho: sp.get("tamanho") ?? undefined,
      cor: sp.get("cor") ?? undefined,
      q: sp.get("q") ?? undefined,
      destaque: sp.get("destaque") === "true" ? true : undefined,
      page,
      pageSize,
    });

    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
