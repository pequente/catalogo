#!/usr/bin/env tsx
/**
 * Rebuild / repair / validate JSON indices for produtos, pedidos, and clientes.
 *
 * Scans entity dirs and writes:
 *   indices/produtos.json (+ shards) + secondary maps + dashboard-catalogo.json
 *   indices/pedidos.json (+ shards)
 *   indices/clientes.json (+ shards) + by-email / by-celular
 *
 * Usage:
 *   npm run indices:rebuild
 *   npm run indices:rebuild -- --data=data-dev
 *   npm run indices:rebuild -- --commit
 *   npm run indices:repair
 *   npm run indices:validate
 *   npm run indices:validate -- --data=data-dev
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
  let commit = false;
  let validateOnly = false;
  let repair = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--commit") commit = true;
    else if (a === "--validate") validateOnly = true;
    else if (a === "--repair") repair = true;
    else if (a.startsWith("--data=")) dataDir = a.slice("--data=".length);
    else if (a === "--data") dataDir = argv[++i] ?? null;
  }
  const life = process.env.npm_lifecycle_event ?? "";
  if (life === "indices:repair") repair = true;
  if (life === "indices:validate") validateOnly = true;
  return { dataDir, commit, validateOnly, repair };
}

async function writeIndexBatch(
  dataRoot: string,
  writes: Array<{ path: string; data: unknown }>,
) {
  for (const w of writes) {
    const abs = path.join(dataRoot, w.path);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, `${JSON.stringify(w.data, null, 2)}\n`, "utf8");
  }
}

async function rebuildProductsViaFs(
  dataRoot: string,
  mode: "rebuild" | "repair",
) {
  const { productSchema } = await import("@/src/schemas/product");
  const { productToIndexEntry } = await import("@/src/schemas/product-index");
  const { stateFromEntries, serializeProductIndexWrites } = await import(
    "@/src/lib/indices/product-index-core"
  );
  const { diffIndexEntryAgainstProduct } = await import(
    "@/src/lib/indices/product-index-entry-match"
  );

  const produtosDir = path.join(dataRoot, "produtos");
  const files = (await fs.readdir(produtosDir)).filter((f) =>
    f.endsWith(".json"),
  );

  const entries = [];
  const products = [];
  let skipped = 0;
  for (const file of files) {
    try {
      const raw = JSON.parse(
        await fs.readFile(path.join(produtosDir, file), "utf8"),
      );
      const parsed = productSchema.safeParse(raw);
      if (!parsed.success) {
        skipped += 1;
        console.warn(`[produtos] skip invalid ${file}`);
        continue;
      }
      products.push(parsed.data);
      entries.push(productToIndexEntry(parsed.data));
    } catch (e) {
      skipped += 1;
      console.warn(
        `[produtos] skip ${file}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const state = stateFromEntries(entries);
  const writes = serializeProductIndexWrites(state);
  await writeIndexBatch(dataRoot, writes);

  const fieldIssues = products.flatMap((p) => {
    const entry = state.entries.find((e) => e.id === p.id);
    if (!entry) return [{ id: p.id, fields: ["<missing>"] }];
    const fields = diffIndexEntryAgainstProduct(entry, p);
    return fields.length ? [{ id: p.id, fields }] : [];
  });

  const ok =
    state.entries.length === files.length - skipped && fieldIssues.length === 0;
  console.log(
    JSON.stringify(
      {
        entity: "produtos",
        mode,
        total: state.entries.length,
        fileCount: files.length,
        skipped,
        ok,
        writes: writes.map((w) => w.path),
        fieldMismatches: fieldIssues.length,
      },
      null,
      2,
    ),
  );
  return ok;
}

async function rebuildOrdersViaFs(
  dataRoot: string,
  mode: "rebuild" | "repair",
) {
  const { orderSchema } = await import("@/src/schemas/order");
  const { orderToIndexEntry } = await import("@/src/schemas/order-index");
  const { stateFromOrderEntries, serializeOrderIndexWrites } = await import(
    "@/src/lib/indices/order-index-core"
  );
  const { diffIndexEntryAgainstOrder } = await import(
    "@/src/lib/indices/order-index-core"
  );

  const dir = path.join(dataRoot, "pedidos");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(JSON.stringify({ entity: "pedidos", mode, total: 0, skipped: 0, ok: true, note: "dir missing" }));
      return true;
    }
    throw e;
  }

  const entries = [];
  const orders = [];
  let skipped = 0;
  for (const file of files) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
      const parsed = orderSchema.safeParse(raw);
      if (!parsed.success) {
        skipped += 1;
        console.warn(`[pedidos] skip invalid ${file}`);
        continue;
      }
      orders.push(parsed.data);
      entries.push(orderToIndexEntry(parsed.data));
    } catch (e) {
      skipped += 1;
      console.warn(
        `[pedidos] skip ${file}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const state = stateFromOrderEntries(entries);
  const writes = serializeOrderIndexWrites(state);
  await writeIndexBatch(dataRoot, writes);

  const fieldIssues = orders.flatMap((o) => {
    const entry = state.entries.find((e) => e.id === o.id);
    if (!entry) return [{ id: o.id, fields: ["<missing>"] }];
    const fields = diffIndexEntryAgainstOrder(entry, o);
    return fields.length ? [{ id: o.id, fields }] : [];
  });

  const ok =
    state.entries.length === files.length - skipped && fieldIssues.length === 0;
  console.log(
    JSON.stringify(
      {
        entity: "pedidos",
        mode,
        total: state.entries.length,
        fileCount: files.length,
        skipped,
        ok,
        writes: writes.map((w) => w.path),
        fieldMismatches: fieldIssues.length,
      },
      null,
      2,
    ),
  );
  return ok;
}

async function rebuildClientsViaFs(
  dataRoot: string,
  mode: "rebuild" | "repair",
) {
  const { clientSchema } = await import("@/src/schemas/client");
  const { clientToIndexEntry } = await import("@/src/schemas/client-index");
  const { stateFromClientEntries, serializeClientIndexWrites } = await import(
    "@/src/lib/indices/client-index-core"
  );
  const { diffIndexEntryAgainstClient } = await import(
    "@/src/lib/indices/client-index-core"
  );

  const dir = path.join(dataRoot, "clientes");
  let files: string[] = [];
  try {
    files = (await fs.readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(JSON.stringify({ entity: "clientes", mode, total: 0, skipped: 0, ok: true, note: "dir missing" }));
      return true;
    }
    throw e;
  }

  const entries = [];
  const clients = [];
  let skipped = 0;
  for (const file of files) {
    try {
      const raw = JSON.parse(await fs.readFile(path.join(dir, file), "utf8"));
      const parsed = clientSchema.safeParse(raw);
      if (!parsed.success) {
        skipped += 1;
        console.warn(`[clientes] skip invalid ${file}`);
        continue;
      }
      clients.push(parsed.data);
      entries.push(clientToIndexEntry(parsed.data));
    } catch (e) {
      skipped += 1;
      console.warn(
        `[clientes] skip ${file}:`,
        e instanceof Error ? e.message : e,
      );
    }
  }

  const state = stateFromClientEntries(entries);
  const writes = serializeClientIndexWrites(state);
  await writeIndexBatch(dataRoot, writes);

  const fieldIssues = clients.flatMap((c) => {
    const entry = state.entries.find((e) => e.id === c.id);
    if (!entry) return [{ id: c.id, fields: ["<missing>"] }];
    const fields = diffIndexEntryAgainstClient(entry, c);
    return fields.length ? [{ id: c.id, fields }] : [];
  });

  const ok =
    state.entries.length === files.length - skipped && fieldIssues.length === 0;
  console.log(
    JSON.stringify(
      {
        entity: "clientes",
        mode,
        total: state.entries.length,
        fileCount: files.length,
        skipped,
        ok,
        writes: writes.map((w) => w.path),
        fieldMismatches: fieldIssues.length,
      },
      null,
      2,
    ),
  );
  return ok;
}

async function validateViaFs(dataRoot: string) {
  const { productSchema } = await import("@/src/schemas/product");
  const { productIndexManifestSchema, productToIndexEntry } = await import(
    "@/src/schemas/product-index"
  );
  const { stateFromEntries, parseManifestEntries } = await import(
    "@/src/lib/indices/product-index-core"
  );
  const { diffIndexEntryAgainstProduct } = await import(
    "@/src/lib/indices/product-index-entry-match"
  );

  const issues: Array<Record<string, unknown>> = [];
  const produtosDir = path.join(dataRoot, "produtos");
  const files = (await fs.readdir(produtosDir)).filter((f) =>
    f.endsWith(".json"),
  );
  const products = [];
  let skipped = 0;
  for (const file of files) {
    const raw = JSON.parse(
      await fs.readFile(path.join(produtosDir, file), "utf8"),
    );
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      skipped += 1;
      continue;
    }
    products.push(parsed.data);
  }

  const manifestPath = path.join(dataRoot, "indices", "produtos.json");
  let rawManifest: unknown = null;
  try {
    rawManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }

  if (!rawManifest) {
    issues.push({ kind: "missing_manifest", path: "indices/produtos.json" });
  } else {
    const parsed = productIndexManifestSchema.safeParse(rawManifest);
    if (!parsed.success) {
      issues.push({ kind: "invalid_manifest", detail: parsed.error.flatten() });
    } else {
      const direct = parseManifestEntries(parsed.data);
      const state = direct
        ? stateFromEntries(direct, parsed.data.updatedAt)
        : null;
      if (!state) {
        if (parsed.data.sharded) {
          // Count-only for sharded product layout in FS validate.
          if (
            typeof parsed.data.total === "number" &&
            parsed.data.total !== products.length
          ) {
            issues.push({
              kind: "count_mismatch",
              entity: "produtos",
              indexTotal: parsed.data.total,
              validFileCount: products.length,
            });
          }
        } else {
          issues.push({
            kind: "sharded_validate_use_adapter",
            note: "Sharded product index: run with --commit for deep adapter validate",
          });
        }
      } else if (state.entries.length !== products.length) {
        issues.push({
          kind: "count_mismatch",
          entity: "produtos",
          indexTotal: state.entries.length,
          validFileCount: products.length,
        });
      } else {
        const byId = new Map(state.entries.map((e) => [e.id, e]));
        for (const p of products) {
          const entry = byId.get(p.id);
          if (!entry) {
            issues.push({ kind: "missing_in_index", productId: p.id });
            continue;
          }
          const fields = diffIndexEntryAgainstProduct(entry, p);
          if (fields.length) {
            issues.push({
              kind: "entry_mismatch",
              productId: p.id,
              fields,
              expectedSlug: productToIndexEntry(p).slug,
            });
          }
        }
      }
    }
  }

  for (const entity of ["pedidos", "clientes"] as const) {
    const entityDir = path.join(dataRoot, entity);
    let entityFiles: string[] = [];
    try {
      entityFiles = (await fs.readdir(entityDir)).filter((f) =>
        f.endsWith(".json"),
      );
    } catch {
      continue;
    }
    const indexPath = path.join(dataRoot, "indices", `${entity}.json`);
    try {
      const manifest = JSON.parse(await fs.readFile(indexPath, "utf8")) as {
        total?: number;
        sharded?: boolean;
      };
      if (
        typeof manifest.total === "number" &&
        manifest.total !== entityFiles.length
      ) {
        issues.push({
          kind: "count_mismatch",
          entity,
          indexTotal: manifest.total,
          fileCount: entityFiles.length,
        });
      }
    } catch {
      issues.push({ kind: "missing_manifest", path: `indices/${entity}.json` });
    }
  }

  const ok = issues.length === 0;
  console.log(
    JSON.stringify(
      {
        mode: "validate",
        dataRoot,
        fileCount: files.length,
        skipped,
        ok,
        issueCount: issues.length,
        issues: issues.slice(0, 50),
      },
      null,
      2,
    ),
  );
  if (!ok) process.exitCode = 1;
}

async function rebuildViaCommit(repair: boolean) {
  const { rebuildAndCommitProductIndices, repairProductIndices } = await import(
    "@/src/lib/indices/product-index-mutate"
  );
  const { rebuildAndCommitOrderIndices, repairOrderIndices } = await import(
    "@/src/lib/indices/order-index-mutate"
  );
  const { rebuildAndCommitClientIndices, repairClientIndices } = await import(
    "@/src/lib/indices/client-index-mutate"
  );

  const products = repair
    ? await repairProductIndices()
    : await rebuildAndCommitProductIndices();
  const orders = repair
    ? await repairOrderIndices()
    : await rebuildAndCommitOrderIndices();
  const clients = repair
    ? await repairClientIndices()
    : await rebuildAndCommitClientIndices();

  console.log(
    JSON.stringify(
      {
        mode: repair ? "repair-commit" : "commit",
        products,
        orders,
        clients,
      },
      null,
      2,
    ),
  );
  if (!products.ok || !orders.ok || !clients.ok) process.exitCode = 1;
}

async function validateViaCommit() {
  const { readProductIndexState, validateProductIndexConsistency } =
    await import("@/src/lib/indices/product-index-io");
  const { readOrderIndexState, validateOrderIndexConsistency } = await import(
    "@/src/lib/indices/order-index-io"
  );
  const { readClientIndexState, validateClientIndexConsistency } = await import(
    "@/src/lib/indices/client-index-io"
  );

  const productState = await readProductIndexState();
  const orderState = await readOrderIndexState();
  const clientState = await readClientIndexState();
  const products = await validateProductIndexConsistency(productState);
  const orders = await validateOrderIndexConsistency(orderState);
  const clients = await validateClientIndexConsistency(clientState);

  console.log(
    JSON.stringify(
      {
        mode: "validate-adapter",
        products: {
          ok: products.ok,
          indexTotal: products.indexTotal,
          fileCount: products.fileCount,
          issueCount: products.deep.issues.length,
          issues: products.deep.issues.slice(0, 20),
        },
        orders: {
          ok: orders.ok,
          indexTotal: orders.indexTotal,
          fileCount: orders.fileCount,
          issueCount: orders.deep.issues.length,
          issues: orders.deep.issues.slice(0, 20),
        },
        clients: {
          ok: clients.ok,
          indexTotal: clients.indexTotal,
          fileCount: clients.fileCount,
          issueCount: clients.deep.issues.length,
          issues: clients.deep.issues.slice(0, 20),
        },
      },
      null,
      2,
    ),
  );
  if (!products.ok || !orders.ok || !clients.ok) process.exitCode = 1;
}

async function main() {
  await loadEnvFile(path.join(root, ".env.local"));
  await loadEnvFile(path.join(root, ".env"));

  const { dataDir, commit, validateOnly, repair } = parseArgs(
    process.argv.slice(2),
  );

  if (validateOnly && commit) {
    await validateViaCommit();
    return;
  }

  if (commit) {
    if (dataDir) {
      console.error("--commit uses DATA_BACKEND paths; omit --data or use FS mode");
      process.exit(1);
    }
    await rebuildViaCommit(repair);
    return;
  }

  const target =
    dataDir ??
    (process.env.NODE_ENV === "production" ? "data" : "data-dev");
  const dataRoot = path.isAbsolute(target)
    ? target
    : path.join(root, target);

  try {
    await fs.access(path.join(dataRoot, "produtos"));
  } catch {
    console.error(`Missing ${path.join(dataRoot, "produtos")}`);
    process.exit(1);
  }

  if (validateOnly) {
    await validateViaFs(dataRoot);
    return;
  }

  const mode = repair ? "repair" : "rebuild";
  const okP = await rebuildProductsViaFs(dataRoot, mode);
  const okO = await rebuildOrdersViaFs(dataRoot, mode);
  const okC = await rebuildClientsViaFs(dataRoot, mode);
  if (!okP || !okO || !okC) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
