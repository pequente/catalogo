import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCep,
  formatEnderecoLinha,
  normalizeCep,
  syncEnderecoTexto,
} from "./endereco.ts";

describe("normalizeCep / formatCep", () => {
  it("keeps up to 8 digits", () => {
    assert.equal(normalizeCep("12345-678"), "12345678");
    assert.equal(normalizeCep("12.345-678 extra"), "12345678");
  });

  it("formats as 00000-000", () => {
    assert.equal(formatCep("12345678"), "12345-678");
    assert.equal(formatCep("12345"), "12345");
  });
});

describe("formatEnderecoLinha", () => {
  it("builds structured line", () => {
    assert.equal(
      formatEnderecoLinha({
        logradouro: "Rua A",
        numero: "10",
        complemento: "Sala 2",
        bairro: "Centro",
        cidade: "Barretos",
        uf: "SP",
      }),
      "Rua A, 10 — Sala 2 · Centro · Barretos-SP",
    );
  });

  it("falls back to legacy texto", () => {
    assert.equal(
      formatEnderecoLinha({
        texto: "Barretos-SP",
        cidade: "Barretos",
        uf: "SP",
      }),
      "Barretos-SP",
    );
  });

  it("syncEnderecoTexto writes texto", () => {
    const synced = syncEnderecoTexto({
      logradouro: "Rua B",
      numero: "1",
      cidade: "X",
      uf: "SP",
      texto: "old",
    });
    assert.equal(synced.texto, "Rua B, 1 · X-SP");
  });
});
