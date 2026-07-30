#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROD = path.join(root, "data");
const DEV = path.join(root, "data-dev");

async function ensureProdExists() {
  try {
    const st = await fs.stat(PROD);
    if (!st.isDirectory()) throw new Error("not a directory");
  } catch {
    console.error(`Pasta de produção não encontrada: ${PROD}`);
    process.exit(1);
  }
}

/** Limpa data-dev e restaura o seed commitado em data/. */
async function reset() {
  await ensureProdExists();
  await fs.rm(DEV, { recursive: true, force: true });
  await fs.cp(PROD, DEV, { recursive: true });
  console.log(`Reset: ${DEV} recriado a partir de ${PROD}`);
}

/** Copia data/ → data-dev/ (sobrescreve) para popular o workspace de development. */
async function restore() {
  await ensureProdExists();
  await fs.mkdir(DEV, { recursive: true });
  await fs.cp(PROD, DEV, { recursive: true });
  console.log(`Restore: conteúdo de ${PROD} copiado para ${DEV}`);
}

const cmd = process.argv[2];
if (cmd === "reset") {
  await reset();
} else if (cmd === "restore") {
  await restore();
} else {
  console.error("Uso: node scripts/dev-data.mjs <reset|restore>");
  process.exit(1);
}
