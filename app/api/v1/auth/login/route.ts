import { NextRequest } from "next/server";
import { getAuthEnv } from "@/src/lib/env";
import { createSession, verifyPassword } from "@/src/lib/auth/session";
import { rateLimit } from "@/src/lib/rate-limit";
import { AppError } from "@/src/lib/api/errors";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { z } from "zod";

const bodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
    if (!rateLimit(`login:${ip}`, 10, 60_000)) {
      throw new AppError("RATE_LIMITED", "Muitas tentativas", 429);
    }
    const json = await req.json();
    const body = bodySchema.parse(json);
    const { username } = getAuthEnv();
    const ok =
      body.username === username && (await verifyPassword(body.password));
    if (!ok) {
      throw new AppError("UNAUTHORIZED", "Credenciais inválidas", 401);
    }
    await createSession(username);
    return jsonOk({ username });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
