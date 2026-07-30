import "server-only";
import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS, type CacheTag } from "@/src/lib/cache-tags";

export type RevalidateStorefrontOpts = {
  /** Product slug(s) to bust `/produto/[slug]` Full Route Cache. */
  productSlugs?: string[];
};

function isOutsideNextRevalidateContext(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("static generation store missing");
}

/**
 * Invalidate tagged Data Cache and the public Full Route Cache (ISR).
 * Call after a successful commit/write so admin + vitrine see fresh data
 * without waiting for a Vercel redeploy.
 *
 * No-op outside a Next.js request (CLI, `data:migrate`, scripts).
 *
 * Path strategy:
 * - `("/", "layout")` — public shell (header/footer) under the root URL tree
 * - `/catalogo` layout — page 1, `/catalogo/page/N`, `/catalogo/busca`
 * - `/produto` layout when site-config changes (PDP embeds textos / WA)
 * - per-slug PDP + sitemap when products change
 * - icons always (logo / branding)
 */
export function revalidateStorefront(
  ...args: (CacheTag | RevalidateStorefrontOpts)[]
) {
  const tags: CacheTag[] = [];
  let opts: RevalidateStorefrontOpts = {};

  for (const arg of args) {
    if (typeof arg === "string") {
      tags.push(arg);
    } else {
      opts = {
        ...opts,
        productSlugs: [
          ...(opts.productSlugs ?? []),
          ...(arg.productSlugs ?? []),
        ],
      };
    }
  }

  const uniqueTags = [...new Set(tags)];
  try {
    for (const tag of uniqueTags) {
      revalidateTag(tag);
    }

    // Public storefront shell + home.
    revalidatePath("/", "layout");
    revalidatePath("/");

    // Catalog ISR tree (unfiltered pages + busca).
    revalidatePath("/catalogo", "layout");
    revalidatePath("/catalogo");
    revalidatePath("/catalogo/busca");

    revalidatePath("/sobre");
    revalidatePath("/carrinho");
    revalidatePath("/icon");
    revalidatePath("/apple-icon");

    const touchesProducts = uniqueTags.includes(CACHE_TAGS.products);
    const touchesSite = uniqueTags.includes(CACHE_TAGS.siteConfig);
    const touchesCategories = uniqueTags.includes(CACHE_TAGS.categories);
    const touchesBanners = uniqueTags.includes(CACHE_TAGS.banners);

    if (touchesProducts || touchesSite || touchesCategories) {
      revalidatePath("/sitemap.xml");
    }

    if (touchesCategories) {
      revalidatePath("/admin/categorias");
      revalidatePath("/admin/produtos", "layout");
    }

    if (touchesBanners || touchesSite) {
      // Home hero / branding already covered by `/`; keep explicit for clarity.
      revalidatePath("/");
    }

    if (touchesSite) {
      // PDPs embed site textos / WhatsApp templates / cart flags.
      revalidatePath("/produto", "layout");
    }

    const slugs = [...new Set((opts.productSlugs ?? []).filter(Boolean))];
    for (const slug of slugs) {
      revalidatePath(`/produto/${slug}`);
    }

    // Broad product mutations (or index rebuild) — also bust the PDP layout tree
    // so pages without an explicit slug still refresh on next request.
    if (touchesProducts && slugs.length === 0) {
      revalidatePath("/produto", "layout");
    }
  } catch (e) {
    if (isOutsideNextRevalidateContext(e)) return;
    throw e;
  }
}
