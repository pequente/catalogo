export const SESSION_COOKIE = "vn_session";

export type AdminClaims = {
  sub: string;
  role: "admin";
};

function b64urlToBytes(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** JWT HS256 verify for Edge middleware (sem jose). */
export async function verifyAdminToken(
  token: string,
): Promise<AdminClaims | null> {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    b64urlToBytes(sigB64) as BufferSource,
    data,
  );
  if (!ok) return null;
  try {
    const payload = JSON.parse(
      new TextDecoder().decode(b64urlToBytes(payloadB64)),
    ) as { sub?: string; role?: string; exp?: number };
    if (payload.role !== "admin" || typeof payload.sub !== "string") {
      return null;
    }
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}
