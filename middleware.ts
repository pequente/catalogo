import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifyAdminToken,
} from "@/src/lib/auth/session-edge";
import { catalogSearchHasFilters } from "@/src/lib/cache/storefront-isr";

/**
 * Legacy catalog query URLs → stable ISR / busca paths:
 * - `/catalogo?page=2` → `/catalogo/page/2`
 * - `/catalogo?categoria=…` → `/catalogo/busca?…`
 */
function redirectLegacyCatalog(req: NextRequest): NextResponse | null {
  const { pathname } = req.nextUrl;
  if (pathname !== "/catalogo") return null;

  const sp = req.nextUrl.searchParams;
  if ([...sp.keys()].length === 0) return null;

  if (catalogSearchHasFilters(sp) || sp.has("pageSize")) {
    const url = req.nextUrl.clone();
    url.pathname = "/catalogo/busca";
    return NextResponse.redirect(url, 308);
  }

  const pageRaw = sp.get("page");
  const page = pageRaw ? Number.parseInt(pageRaw, 10) : 1;
  if (Number.isFinite(page) && page > 1) {
    const url = req.nextUrl.clone();
    url.pathname = `/catalogo/page/${page}`;
    url.searchParams.delete("page");
    // No remaining query expected; drop empty search.
    if ([...url.searchParams.keys()].length === 0) {
      url.search = "";
    }
    return NextResponse.redirect(url, 308);
  }

  // Stray `?page=1` or unknown keys — strip to canonical `/catalogo`.
  if (sp.has("page") && (!Number.isFinite(page) || page <= 1)) {
    const url = req.nextUrl.clone();
    url.pathname = "/catalogo";
    url.search = "";
    return NextResponse.redirect(url, 308);
  }

  return null;
}

export async function middleware(req: NextRequest) {
  const catalogRedirect = redirectLegacyCatalog(req);
  if (catalogRedirect) return catalogRedirect;

  const { pathname } = req.nextUrl;
  const isAdminPage =
    pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isAdminApi = pathname.startsWith("/api/v1/admin");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifyAdminToken(token) : null;

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Não autenticado" } },
        { status: 401 },
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/catalogo", "/admin/:path*", "/api/v1/admin/:path*"],
};
