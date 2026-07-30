/**
 * Fase 6 — static gate against read-scalability anti-patterns.
 * Used by CI (`npm test`) and `npm run phase6:verify`.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export type AntiPatternId =
  | "slice_after_full_list"
  | "full_catalog_in_rsc"
  | "slug_scan"
  | "isr_without_index"
  | "entity_without_index_commit";

export type AntiPatternFinding = {
  id: AntiPatternId;
  severity: "error" | "warn";
  path: string;
  detail: string;
};

export type AntiPatternCheckResult = {
  id: AntiPatternId;
  title: string;
  ok: boolean;
  findings: AntiPatternFinding[];
};

const HOT_APP_GLOBS = [
  "app/admin",
  "app/(public)",
  "app/api/v1/products",
  "app/api/v1/admin/products",
  "app/sitemap.ts",
] as const;

const HOT_SERVICE_FILES = [
  "src/services/dashboard.service.ts",
  "src/services/products.service.ts",
] as const;

/** Paths where full-catalog helpers may still appear (definition / diagnostics). */
const FULL_LIST_ALLOWLIST = [
  "app/api/v1/admin/diagnostics/",
  "src/lib/cache/storefront-reads.ts",
  "src/services/products.service.ts",
  "scripts/",
  "src/lib/indices/phase6-anti-patterns",
] as const;

const FORBIDDEN_FULL_LIST_SYMBOLS = [
  "listAllProducts",
  "getCachedAllProducts",
  "getCachedPublicProductList",
] as const;

async function walkTsFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return out;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      out.push(...(await walkTsFiles(full)));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function isAllowlisted(relPosix: string): boolean {
  return FULL_LIST_ALLOWLIST.some(
    (prefix) => relPosix === prefix || relPosix.startsWith(prefix),
  );
}

/** Extract `export async function name(...) { ... }` with nested braces. */
function extractExportedAsyncFunction(
  source: string,
  name: string,
): string | null {
  const startRe = new RegExp(`export async function ${name}\\s*\\(`);
  const start = source.search(startRe);
  if (start < 0) return null;

  // Walk parameter list — types may contain `{ ... }` before the body.
  const paramsOpen = source.indexOf("(", start);
  if (paramsOpen < 0) return null;
  let parenDepth = 0;
  let i = paramsOpen;
  for (; i < source.length; i++) {
    const ch = source[i];
    if (ch === "(") parenDepth++;
    else if (ch === ")") {
      parenDepth--;
      if (parenDepth === 0) {
        i++;
        break;
      }
    }
  }

  const braceStart = source.indexOf("{", i);
  if (braceStart < 0) return null;
  let depth = 0;
  for (let j = braceStart; j < source.length; j++) {
    const ch = source[j];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j + 1);
    }
  }
  return null;
}

function symbolUsedOutsideDefinition(
  source: string,
  symbol: string,
): boolean {
  // Match calls / imports, not the export declaration line alone.
  const importRe = new RegExp(
    `import\\s*{[^}]*\\b${symbol}\\b[^}]*}\\s*from`,
    "m",
  );
  const callRe = new RegExp(`\\b${symbol}\\s*\\(`, "m");
  const exportDecl = new RegExp(
    `export\\s+(?:async\\s+)?function\\s+${symbol}\\b|export\\s+const\\s+${symbol}\\b`,
    "m",
  );
  if (importRe.test(source)) return true;
  if (callRe.test(source) && !exportDecl.test(source)) return true;
  if (callRe.test(source) && exportDecl.test(source)) {
    // Definition file that also calls itself (unlikely) — count extra calls.
    const calls = source.match(new RegExp(`\\b${symbol}\\s*\\(`, "g")) ?? [];
    return calls.length > 1;
  }
  return false;
}

async function collectHotFiles(root: string): Promise<string[]> {
  const files = new Set<string>();
  for (const rel of HOT_APP_GLOBS) {
    const abs = path.join(root, rel);
    const st = await fs.stat(abs).catch(() => null);
    if (!st) continue;
    if (st.isFile()) files.add(abs);
    else for (const f of await walkTsFiles(abs)) files.add(f);
  }
  for (const rel of HOT_SERVICE_FILES) {
    files.add(path.join(root, rel));
  }
  return [...files];
}

async function checkFullCatalogInHotPaths(
  root: string,
): Promise<AntiPatternCheckResult> {
  const findings: AntiPatternFinding[] = [];
  const files = await collectHotFiles(root);

  for (const abs of files) {
    const rel = toPosix(path.relative(root, abs));
    if (isAllowlisted(rel)) continue;
    const source = await fs.readFile(abs, "utf8");
    for (const symbol of FORBIDDEN_FULL_LIST_SYMBOLS) {
      if (!symbolUsedOutsideDefinition(source, symbol)) continue;
      findings.push({
        id: "full_catalog_in_rsc",
        severity: "error",
        path: rel,
        detail: `Hot path uses \`${symbol}\` — use index/DTO pagination instead.`,
      });
    }
  }

  return {
    id: "full_catalog_in_rsc",
    title: "Não embutir catálogo completo em RSC props / HTML",
    ok: findings.length === 0,
    findings,
  };
}

async function checkSliceAfterFullList(
  root: string,
): Promise<AntiPatternCheckResult> {
  const findings: AntiPatternFinding[] = [];
  const files = await collectHotFiles(root);

  for (const abs of files) {
    const rel = toPosix(path.relative(root, abs));
    if (isAllowlisted(rel)) continue;
    const source = await fs.readFile(abs, "utf8");
    const loadsFull =
      /\blistAllProducts\s*\(/.test(source) ||
      /\bgetCachedAllProducts\s*\(/.test(source);
    const slices =
      /\.slice\s*\(/.test(source) ||
      /\bpaginateItems\s*\(/.test(source);
    if (loadsFull && slices) {
      findings.push({
        id: "slice_after_full_list",
        severity: "error",
        path: rel,
        detail:
          "Carrega catálogo completo e depois slice/paginate — paginação de I/O falsa.",
      });
    }
  }

  // pagination.ts may slice in-memory index pages — that is OK (not full entity load).
  return {
    id: "slice_after_full_list",
    title: "Não carregar todos os JSON e só então slice para “paginar”",
    ok: findings.length === 0,
    findings,
  };
}

async function checkSlugLookupUsesIndex(
  root: string,
): Promise<AntiPatternCheckResult> {
  const findings: AntiPatternFinding[] = [];
  const abs = path.join(root, "src/services/products.service.ts");
  const source = await fs.readFile(abs, "utf8");

  const body = extractExportedAsyncFunction(source, "getProductBySlug") ?? "";
  if (!body.includes("resolveProductIdBySlug")) {
    findings.push({
      id: "slug_scan",
      severity: "error",
      path: "src/services/products.service.ts",
      detail:
        "`getProductBySlug` must resolve via `resolveProductIdBySlug` (index), not scan all products.",
    });
  }
  if (/\blistAllProducts\s*\(/.test(body) || /\blistJsonDir\s*\(/.test(body)) {
    findings.push({
      id: "slug_scan",
      severity: "error",
      path: "src/services/products.service.ts",
      detail: "`getProductBySlug` must not call listAllProducts / listJsonDir.",
    });
  }

  return {
    id: "slug_scan",
    title: "Lookup por slug sem scan de todos os produtos",
    ok: findings.length === 0,
    findings,
  };
}

async function checkIsrUsesIndexLoaders(
  root: string,
): Promise<AntiPatternCheckResult> {
  const findings: AntiPatternFinding[] = [];
  const publicRoot = path.join(root, "app/(public)");
  const files = await walkTsFiles(publicRoot);

  for (const abs of files) {
    const rel = toPosix(path.relative(root, abs));
    const source = await fs.readFile(abs, "utf8");
    const hasRevalidate = /export\s+const\s+revalidate\s*=/.test(source);
    if (!hasRevalidate) continue;

    for (const symbol of FORBIDDEN_FULL_LIST_SYMBOLS) {
      if (symbolUsedOutsideDefinition(source, symbol)) {
        findings.push({
          id: "isr_without_index",
          severity: "error",
          path: rel,
          detail: `ISR page uses \`${symbol}\` — miss de regeneração ficaria O(N).`,
        });
      }
    }
  }

  // Require catalog/home/PDP to prefer index helpers when they load products.
  const mustPreferIndex = [
    "app/(public)/catalogo/page.tsx",
    "app/(public)/page.tsx",
    "app/(public)/produto/[slug]/page.tsx",
  ];
  for (const rel of mustPreferIndex) {
    const abs = path.join(root, rel);
    const source = await fs.readFile(abs, "utf8").catch(() => null);
    if (source == null) {
      findings.push({
        id: "isr_without_index",
        severity: "warn",
        path: rel,
        detail: "Arquivo esperado ausente.",
      });
      continue;
    }
    const usesIndexLoader =
      /\blistCachedProductListItems\b/.test(source) ||
      /\bgetCachedProductBySlug\b/.test(source) ||
      /\bgetCachedPublicProductSlugs\b/.test(source) ||
      /\bgetCachedProductsByIds\b/.test(source) ||
      /\bgetCachedPublicCatalogFacets\b/.test(source);
    const loadsProducts =
      /product/i.test(source) &&
      (/\blistCached/.test(source) ||
        /\bgetCachedProduct/.test(source) ||
        /\blistAllProducts\b/.test(source));
    if (loadsProducts && !usesIndexLoader) {
      findings.push({
        id: "isr_without_index",
        severity: "error",
        path: rel,
        detail: "Storefront ISR deve carregar produtos via índice/DTO cacheado.",
      });
    }
  }

  return {
    id: "isr_without_index",
    title: "ISR sem índice (miss caro disfarçado de página estática)",
    ok: findings.filter((f) => f.severity === "error").length === 0,
    findings,
  };
}

async function checkEntityIndexCoCommit(
  root: string,
): Promise<AntiPatternCheckResult> {
  const findings: AntiPatternFinding[] = [];
  const abs = path.join(root, "src/services/products.service.ts");
  const source = await fs.readFile(abs, "utf8");

  for (const fnName of [
    "createProduct",
    "updateProduct",
    "deleteProduct",
  ] as const) {
    const body = extractExportedAsyncFunction(source, fnName);
    if (!body) {
      findings.push({
        id: "entity_without_index_commit",
        severity: "error",
        path: "src/services/products.service.ts",
        detail: `Função \`${fnName}\` não encontrada.`,
      });
      continue;
    }
    const hasIndexWrites =
      /\bindexWrites\b/.test(body) ||
      /\bindexWritesAfterUpsert\b/.test(body) ||
      /\bindexWritesAfterRemove\b/.test(body);
    const hasCommit = /\bcommitFiles\s*\(/.test(body);
    if (!hasCommit) {
      findings.push({
        id: "entity_without_index_commit",
        severity: "error",
        path: "src/services/products.service.ts",
        detail: `\`${fnName}\` não chama commitFiles.`,
      });
      continue;
    }
    if (!hasIndexWrites) {
      findings.push({
        id: "entity_without_index_commit",
        severity: "error",
        path: "src/services/products.service.ts",
        detail: `\`${fnName}\` deve incluir writes de índice no mesmo commitFiles.`,
      });
    }
    // Ensure index writes appear in the same buildMutationFiles / commit batch.
    if (
      hasIndexWrites &&
      !/\.\.\.indexWrites/.test(body) &&
      !/jsonWrites:\s*indexWrites\b/.test(body) &&
      !/jsonWrites:\s*\[[\s\S]*indexWrites/.test(body)
    ) {
      findings.push({
        id: "entity_without_index_commit",
        severity: "warn",
        path: "src/services/products.service.ts",
        detail: `\`${fnName}\`: confirme que indexWrites entram no mesmo lote de commitFiles.`,
      });
    }
  }

  return {
    id: "entity_without_index_commit",
    title: "Atualizar entidade e índice no mesmo commit",
    ok: findings.filter((f) => f.severity === "error").length === 0,
    findings,
  };
}

export async function runPhase6AntiPatternChecks(
  root: string,
): Promise<{
  ok: boolean;
  checks: AntiPatternCheckResult[];
  findings: AntiPatternFinding[];
}> {
  const checks = await Promise.all([
    checkSliceAfterFullList(root),
    checkFullCatalogInHotPaths(root),
    checkSlugLookupUsesIndex(root),
    checkIsrUsesIndexLoaders(root),
    checkEntityIndexCoCommit(root),
  ]);
  const findings = checks.flatMap((c) => c.findings);
  const ok = checks.every((c) => c.ok);
  return { ok, checks, findings };
}

export const PHASE6_ANTI_PATTERN_TITLES: Record<AntiPatternId, string> = {
  slice_after_full_list:
    "Carregar todos os JSON e só então slice para “paginar”",
  full_catalog_in_rsc: "Embutir catálogo completo em RSC props / HTML",
  slug_scan: "Lookup por slug com scan de todos os produtos",
  isr_without_index: "ISR sem índice: miss caro disfarçado de página estática",
  entity_without_index_commit:
    "Atualizar entidade sem atualizar o índice no mesmo commit",
};
