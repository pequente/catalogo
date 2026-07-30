import "server-only";
import { listJsonDir, readJson } from "@/src/lib/data";
import type { ClientIndexState } from "@/src/schemas/client-index";
import { clientSchema, type Client } from "@/src/schemas/client";
import { diffIndexEntryAgainstClient } from "@/src/lib/indices/client-index-core";

export type ClientIndexConsistencyIssue =
  | {
      kind: "count_mismatch";
      indexTotal: number;
      fileCount: number;
      validFileCount: number;
    }
  | { kind: "missing_in_index"; clientId: string }
  | { kind: "orphan_in_index"; clientId: string }
  | { kind: "invalid_entity"; path: string; detail?: string }
  | {
      kind: "entry_mismatch";
      clientId: string;
      fields: string[];
    }
  | {
      kind: "email_map_mismatch";
      email: string;
      expectedId: string | null;
      actualId: string | null;
    }
  | {
      kind: "celular_map_mismatch";
      celular: string;
      expectedId: string | null;
      actualId: string | null;
    };

export type ClientIndexConsistencyReport = {
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  validFileCount: number;
  checkedEntries: number;
  issues: ClientIndexConsistencyIssue[];
};

export { diffIndexEntryAgainstClient };

export async function auditClientIndexConsistency(
  state: ClientIndexState | null,
): Promise<ClientIndexConsistencyReport> {
  const files = await listJsonDir("clientes");
  const issues: ClientIndexConsistencyIssue[] = [];

  const clients: Client[] = [];
  const validIds = new Set<string>();

  for (const file of files) {
    const rel = `clientes/${file}`;
    const raw = await readJson<unknown>(rel);
    const parsed = clientSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push({
        kind: "invalid_entity",
        path: rel,
        detail: parsed.error.issues[0]?.message,
      });
      continue;
    }
    clients.push(parsed.data);
    validIds.add(parsed.data.id);
  }

  const indexTotal = state?.entries.length ?? -1;
  const validFileCount = clients.length;

  if (!state) {
    if (files.length > 0) {
      issues.push({
        kind: "count_mismatch",
        indexTotal: -1,
        fileCount: files.length,
        validFileCount,
      });
    }
    return {
      ok: issues.length === 0 && files.length === 0,
      indexTotal,
      fileCount: files.length,
      validFileCount,
      checkedEntries: 0,
      issues,
    };
  }

  if (indexTotal !== validFileCount) {
    issues.push({
      kind: "count_mismatch",
      indexTotal,
      fileCount: files.length,
      validFileCount,
    });
  }

  const indexById = new Map(state.entries.map((e) => [e.id, e]));

  for (const client of clients) {
    const entry = indexById.get(client.id);
    if (!entry) {
      issues.push({ kind: "missing_in_index", clientId: client.id });
      continue;
    }
    const fields = diffIndexEntryAgainstClient(entry, client);
    if (fields.length > 0) {
      issues.push({ kind: "entry_mismatch", clientId: client.id, fields });
    }
  }

  for (const entry of state.entries) {
    if (!validIds.has(entry.id)) {
      issues.push({ kind: "orphan_in_index", clientId: entry.id });
    }
  }

  for (const client of clients) {
    const email = client.email?.trim().toLowerCase();
    if (email) {
      const mapped = state.byEmail[email] ?? null;
      if (mapped !== client.id) {
        issues.push({
          kind: "email_map_mismatch",
          email,
          expectedId: client.id,
          actualId: mapped,
        });
      }
    }
    if (client.celular) {
      const mapped = state.byCelular[client.celular] ?? null;
      if (mapped !== client.id) {
        issues.push({
          kind: "celular_map_mismatch",
          celular: client.celular,
          expectedId: client.id,
          actualId: mapped,
        });
      }
    }
  }

  return {
    ok: issues.length === 0,
    indexTotal,
    fileCount: files.length,
    validFileCount,
    checkedEntries: clients.length,
    issues,
  };
}
