import { clearSession } from "@/src/lib/auth/session";
import { jsonOk } from "@/src/lib/api/response";

export async function POST() {
  await clearSession();
  return jsonOk({ ok: true });
}
