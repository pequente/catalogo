import { getSession } from "@/src/lib/auth/session";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return jsonError(new AppError("UNAUTHORIZED", "Não autenticado", 401));
  }
  return jsonOk({ username: session.sub });
}
