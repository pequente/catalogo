#!/usr/bin/env tsx
/**
 * Migrates product JSON files from legacy tamanho/cor to atributos.
 * Idempotent — safe to run multiple times.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dataDir = process.argv.includes("--data-dev")
  ? join(import.meta.dirname, "..", "data-dev")
  : join(import.meta.dirname, "..", "data");

const prodDir = join(dataDir, "produtos");
let changed = 0;

for (const file of readdirSync(prodDir)) {
  if (!file.endsWith(".json")) continue;
  const path = join(prodDir, file);
  const raw = JSON.parse(readFileSync(path, "utf8")) as {
    variantes?: Array<Record<string, unknown>>;
  };
  if (!Array.isArray(raw.variantes)) continue;
  let fileChanged = false;
  for (const v of raw.variantes) {
    const attrs =
      v.atributos && typeof v.atributos === "object" && !Array.isArray(v.atributos)
        ? { ...(v.atributos as Record<string, string>) }
        : {};
    if (typeof v.tamanho === "string" && v.tamanho.trim()) {
      attrs.tamanho = (v.tamanho as string).trim();
      delete v.tamanho;
      fileChanged = true;
    }
    if (typeof v.cor === "string" && v.cor.trim()) {
      attrs.cor = (v.cor as string).trim();
      delete v.cor;
      fileChanged = true;
    }
    if (Object.keys(attrs).length > 0) {
      v.atributos = attrs;
      fileChanged = true;
    }
  }
  if (fileChanged) {
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`);
    changed += 1;
  }
}

console.log(`migrate-product-variants: ${changed} arquivo(s) atualizado(s) em ${prodDir}`);
