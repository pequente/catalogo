import "server-only";
import path from "node:path";
import { ImageResponse } from "next/og";
import { readBinary } from "@/src/lib/data";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function initials(nome: string): string {
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "VN"
  );
}

/** Serve store logo as app icon, or a generated mark when none is set. */
export async function siteIconResponse(size: {
  width: number;
  height: number;
}): Promise<Response> {
  const site = await getCachedSiteConfig();
  if (site.logo?.path) {
    const bytes = await readBinary(site.logo.path);
    if (bytes) {
      const ext = path.extname(site.logo.path).toLowerCase();
      const contentType = MIME[ext] ?? "image/png";
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control":
            "public, max-age=60, s-maxage=60, stale-while-revalidate=86400",
        },
      });
    }
  }

  const mark = initials(site.nomeLoja);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: site.cores.primaria,
          color: "#fff",
          fontSize: Math.round(size.width * 0.38),
          fontWeight: 800,
          letterSpacing: "-0.02em",
        }}
      >
        {mark}
      </div>
    ),
    { ...size },
  );
}
