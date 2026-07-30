import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { getAuthEnv } from "@/src/lib/env";

export type AdminClaims = {
  sub: string;
  role: "admin";
};

function secretKey() {
  return new TextEncoder().encode(getAuthEnv().jwtSecret);
}

export async function signAdminToken(username: string): Promise<string> {
  const { jwtTtl } = getAuthEnv();
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuedAt()
    .setExpirationTime(jwtTtl)
    .sign(secretKey());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.role !== "admin" || typeof payload.sub !== "string") {
      return null;
    }
    return { sub: payload.sub, role: "admin" };
  } catch {
    return null;
  }
}

export function ttlToSeconds(ttl: string): number {
  const m = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!m) return 8 * 3600;
  const n = Number(m[1]);
  const unit = m[2];
  const mult =
    unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
}
