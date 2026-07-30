import { NextResponse } from "next/server";
import { toErrorResponse } from "./errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(e: unknown) {
  const { status, body } = toErrorResponse(e);
  return NextResponse.json(body, { status });
}
