import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { listClientsPage } from "@/src/services/clients.service";
import { normalizePagination, PAGINATION } from "@/src/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const sp = req.nextUrl.searchParams;
    const { page, pageSize } = normalizePagination(
      {
        page: sp.get("page"),
        pageSize: sp.get("pageSize"),
      },
      { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
    );
    const q = sp.get("q") ?? undefined;
    return jsonOk(await listClientsPage({ q, page, pageSize }));
  } catch (e) {
    return jsonError(e);
  }
}
