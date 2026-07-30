import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/src/lib/api/response";
import { AppError } from "@/src/lib/api/errors";
import { upsertClient } from "@/src/services/clients.service";
import { clientUpsertSchema } from "@/src/schemas/client";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = clientUpsertSchema.parse(await req.json());
    const client = await upsertClient(body);
    return jsonOk(
      {
        id: client.id,
        nome: client.nome,
        email: client.email,
        celular: client.celular,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError(
        new AppError("VALIDATION_ERROR", "Dados inválidos", 400, e.flatten()),
      );
    }
    return jsonError(e);
  }
}
