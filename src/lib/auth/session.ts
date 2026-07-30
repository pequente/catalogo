import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getAuthEnv } from "@/src/lib/env";
import { signAdminToken, ttlToSeconds, verifyAdminToken } from "./jwt";
import { SESSION_COOKIE, type AdminClaims } from "./session-edge";

export { SESSION_COOKIE };
export type { AdminClaims };

function sha256(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

export async function verifyPassword(password: string): Promise<boolean> {
  const { password: expected } = getAuthEnv();
  return timingSafeEqual(sha256(password), sha256(expected));
}

export async function createSession(username: string) {
  const token = await signAdminToken(username);
  const { jwtTtl } = getAuthEnv();
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ttlToSeconds(jwtTtl),
  });
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<AdminClaims | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function requireAdmin(): Promise<AdminClaims> {
  const session = await getSession();
  if (!session) {
    const { AppError } = await import("@/src/lib/api/errors");
    throw new AppError("UNAUTHORIZED", "Não autenticado", 401);
  }
  return session;
}
