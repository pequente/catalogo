import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { readBinary } from "@/src/lib/data";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import path from "node:path";

type Ctx = { params: Promise<{ path: string[] }> };

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

const REVALIDATE_SECONDS = 3600;

/** Next Data Cache rejects entries over 2MB; base64 is ~4/3 of raw size. */
const MAX_RAW_FOR_DATA_CACHE = 1_400_000;

type CachedMedia =
  | { kind: "data"; base64: string }
  | { kind: "large" };

class MediaNotFoundError extends Error {
  constructor(relative: string) {
    super(`Media not found: ${relative}`);
    this.name = "MediaNotFoundError";
  }
}

/**
 * Cache hits only — throws on miss so 404s are not stored in the Data Cache.
 * Oversized files cache a tiny marker; the handler re-reads them (HTTP Cache-Control still applies).
 */
function getCachedMediaEntry(relative: string) {
  return unstable_cache(
    async (): Promise<CachedMedia> => {
      const bytes = await readBinary(relative);
      if (!bytes) throw new MediaNotFoundError(relative);
      if (bytes.length > MAX_RAW_FOR_DATA_CACHE) {
        return { kind: "large" };
      }
      return { kind: "data", base64: bytes.toString("base64") };
    },
    // v3: structured entries so >2MB files no longer blow the Data Cache
    [`media-v3-${relative}`],
    { tags: [CACHE_TAGS.media], revalidate: REVALIDATE_SECONDS },
  )();
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const parts = (await ctx.params).path;
  if (!parts?.length) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Not found" } },
      { status: 404 },
    );
  }
  const relative = ["imagens", ...parts].join("/");
  let entry: CachedMedia;
  try {
    entry = await getCachedMediaEntry(relative);
  } catch (e) {
    const isMiss =
      e instanceof MediaNotFoundError ||
      (e instanceof Error && e.name === "MediaNotFoundError");
    if (isMiss) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 },
      );
    }
    throw e;
  }

  let body: Uint8Array;
  if (entry.kind === "large") {
    const bytes = await readBinary(relative);
    if (!bytes) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Not found" } },
        { status: 404 },
      );
    }
    body = new Uint8Array(bytes);
  } else {
    body = new Uint8Array(Buffer.from(entry.base64, "base64"));
  }

  const ext = path.extname(relative).toLowerCase();
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
