import { NextRequest } from "next/server";
import { requireAdmin } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { parseAdminMutationForm } from "@/src/lib/admin/parse-multipart";
import {
  createProduct,
  getProductById,
  listProductsPage,
  listProductsPageFull,
} from "@/src/services/products.service";
import { productCreateSchema, productStatusSchema } from "@/src/schemas/product";
import { normalizePagination, PAGINATION, parseOptionalBooleanParam } from "@/src/lib/pagination";
import {
  estimateJsonPayloadBytes,
  runWithListingReadMetrics,
} from "@/src/lib/observability/listing-read";
import { z } from "zod";

/**
 * GET /api/v1/admin/products
 * Paginated lean DTOs by default (index-backed). Use `full=1` only when the
 * caller needs variantes for the current page (rare — prefer GET by id).
 * Filters: q, status, categoria, destaque, lancamento.
 * Never returns the entire catalog unless pageSize is explicitly raised (max 100).
 */
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
    const statusRaw = sp.get("status");
    const status = statusRaw
      ? productStatusSchema.parse(statusRaw)
      : undefined;
    const q = sp.get("q") ?? undefined;
    const categoria = sp.get("categoria") ?? undefined;
    const destaque = parseOptionalBooleanParam(sp.get("destaque"));
    const lancamento = parseOptionalBooleanParam(sp.get("lancamento"));
    const wantFull = sp.get("full") === "1" || sp.get("full") === "true";

    const filters = {
      page,
      pageSize,
      q,
      status,
      categoria: categoria || undefined,
      ...(destaque === true ? { destaque: true as const } : {}),
      ...(lancamento === true ? { lancamento: true as const } : {}),
    };

    if (wantFull) {
      const { result } = await runWithListingReadMetrics(
        {
          label: "admin.api.products.listing.full",
          route: "/api/v1/admin/products",
          page,
          pageSize,
          estimateHtmlBytes: (pageResult) =>
            estimateJsonPayloadBytes(pageResult),
        },
        () => listProductsPageFull(filters),
      );
      return jsonOk(result);
    }

    const { result } = await runWithListingReadMetrics(
      {
        label: "admin.api.products.listing",
        route: "/api/v1/admin/products",
        page,
        pageSize,
        estimateHtmlBytes: (pageResult) =>
          estimateJsonPayloadBytes(pageResult),
      },
      () => listProductsPage(filters),
    );
    return jsonOk(result);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Filtros inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { payload, pendingBinaries } = await parseAdminMutationForm(req);
    const body = productCreateSchema.parse(payload);
    const product = await createProduct(body, pendingBinaries);
    return jsonOk(product, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}

/** Used by batch lookup helper route — re-export pattern via ids query on same GET? */
void getProductById;
