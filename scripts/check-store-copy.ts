/**
 * CI guard: known hardcoded vitrine strings should not reappear in public components.
 * Run: npx tsx scripts/check-store-copy.ts
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");

const FORBIDDEN_IN_PUBLIC = [
  "Ver coleção",
  "Página não encontrada",
  "Quase lá",
  "Buscar produtos…",
  "Nenhum produto encontrado.",
  "Tenho interesse",
  "Adicionar ao carrinho",
  "Ver oferta",
];

const SCAN_DIRS = [
  join(ROOT, "components/public"),
  join(ROOT, "app/(public)"),
];

const ALLOWLIST = new Set([
  "components/public/layouts/options.ts",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name)) out.push(p);
  }
  return out;
}

let failed = false;

for (const dir of SCAN_DIRS) {
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file);
    if (ALLOWLIST.has(rel)) continue;
    const src = readFileSync(file, "utf8");
    for (const needle of FORBIDDEN_IN_PUBLIC) {
      if (src.includes(needle)) {
        console.error(`[store-copy] "${needle}" em ${rel}`);
        failed = true;
      }
    }
  }
}

if (failed) {
  console.error("\nUse site.textos / store-copy em vez de strings fixas.");
  process.exit(1);
}

console.log("check-store-copy: ok");
