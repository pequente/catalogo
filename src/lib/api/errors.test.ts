import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError, toErrorResponse } from "@/src/lib/api/errors";

describe("toErrorResponse", () => {
  it("maps AppError VERSION_CONFLICT", () => {
    const res = toErrorResponse(
      new AppError(
        "VERSION_CONFLICT",
        "Versão desatualizada. Recarregue e tente novamente.",
        409,
      ),
    );
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "VERSION_CONFLICT");
    assert.match(res.body.error.message, /Versão desatualizada/);
  });

  it("maps raw REF_CONFLICT distinctly from VERSION_CONFLICT", () => {
    const err = new Error("ref update failed") as Error & { code: string };
    err.code = "REF_CONFLICT";
    const res = toErrorResponse(err);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "REF_CONFLICT");
    assert.match(res.body.error.message, /conflito de armazenamento/i);
    assert.notEqual(res.body.error.code, "VERSION_CONFLICT");
  });

  it("maps STORAGE_BUSY with Portuguese message", () => {
    const err = new Error("busy") as Error & { code: string };
    err.code = "STORAGE_BUSY";
    const res = toErrorResponse(err);
    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, "STORAGE_BUSY");
    assert.match(res.body.error.message, /Armazenamento ocupado/);
  });

  it("maps raw VERSION_CONFLICT from adapters", () => {
    const err = new Error("stale") as Error & { code: string };
    err.code = "VERSION_CONFLICT";
    const res = toErrorResponse(err);
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "VERSION_CONFLICT");
  });
});
