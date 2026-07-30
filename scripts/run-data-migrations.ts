#!/usr/bin/env tsx
/**
 * Run ordered JSON data migrations (entity files + ledger).
 *
 * Usage:
 *   npm run data:migrate
 *   npm run data:migrate -- --data=data-dev
 *   npm run data:migrate -- --dry-run
 */

import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const serverOnlyPath = require.resolve("server-only");
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
} as NodeModule;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function loadEnvFile(filePath: string) {
  try {
    const text = await fs.readFile(filePath, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

function parseArgs(argv: string[]) {
  let dataDir: string | null = null;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--dry-run") dryRun = true;
    else if (a.startsWith("--data=")) dataDir = a.slice("--data=".length);
    else if (a === "--data") dataDir = argv[++i] ?? null;
  }
  return { dataDir, dryRun };
}

async function main() {
  await loadEnvFile(path.join(root, ".env.local"));
  await loadEnvFile(path.join(root, ".env"));

  const { dataDir, dryRun } = parseArgs(process.argv.slice(2));
  const target =
    dataDir ??
    (process.env.NODE_ENV === "production" ? "data" : "data-dev");
  const dataRoot = path.isAbsolute(target)
    ? target
    : path.join(root, target);

  try {
    await fs.access(dataRoot);
  } catch {
    console.error(`Data directory not found: ${dataRoot}`);
    process.exit(1);
  }

  process.env.VINA_DATA_ROOT = dataRoot;
  process.env.DATA_BACKEND = "fs";

  const { runDataMigrations } = await import(
    "@/src/lib/data/migrations/runner"
  );
  const summary = await runDataMigrations({ trigger: "cli", dryRun });
  console.log(JSON.stringify(summary, null, 2));
  if (!dryRun && summary.applied.length === 0 && summary.skipped.length === 0) {
    console.info("[migrations] nothing to do");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
