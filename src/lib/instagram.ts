/** Instagram username: letters, digits, underscore, period (1–30). */
export const INSTAGRAM_HANDLE_RE = /^[a-z0-9._]{1,30}$/;

/**
 * Normalizes user input to a bare handle: trim, strip leading @, lowercase.
 * Accepts pasted profile URLs (instagram.com/username).
 */
export function normalizeInstagramHandle(raw: string): string {
  let s = raw.trim();
  if (!s) return "";

  if (/^https?:\/\//i.test(s) || /^instagram\.com/i.test(s)) {
    try {
      const url = s.startsWith("http") ? new URL(s) : new URL(`https://${s}`);
      const host = url.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "instagram.com") {
        const segment = url.pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
        if (segment) s = segment;
      }
    } catch {
      /* keep raw string */
    }
  }

  return s.replace(/^@+/, "").toLowerCase();
}

export function instagramProfileUrl(handle: string): string {
  return `https://instagram.com/${handle}`;
}

export function syncInstagram(input: {
  handle: string;
  url?: string;
  mostrar: boolean;
}): { handle: string; url: string; mostrar: boolean } {
  const handle = normalizeInstagramHandle(input.handle);
  return {
    handle,
    url: handle ? instagramProfileUrl(handle) : "",
    mostrar: input.mostrar,
  };
}
