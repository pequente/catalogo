import type { Client } from "@/src/schemas/client";
import {
  emptyClientIndexState,
  clientToIndexEntry,
  sortClientIndexEntries,
  type ClientIndexEntry,
  type ClientIndexState,
  type ClientIndexManifest,
  type ClientEmailIndex,
  type ClientCelularIndex,
  CLIENT_INDEX_SCHEMA_VERSION,
  CLIENT_INDEX_SHARD_SIZE,
  CLIENT_INDEX_SHARD_THRESHOLD,
} from "@/src/schemas/client-index";
import {
  CLIENT_INDEX_MANIFEST_PATH,
  CLIENT_INDEX_META_PATH,
  CLIENT_EMAIL_INDEX_PATH,
  CLIENT_CELULAR_INDEX_PATH,
  clientIndexShardPath,
} from "@/src/lib/indices/paths";

export type ClientIndexListFilters = {
  q?: string;
};

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() || undefined;
}

export function diffIndexEntryAgainstClient(
  entry: ClientIndexEntry,
  client: Client,
): string[] {
  const expected = clientToIndexEntry(client);
  const fields: string[] = [];
  if (entry.id !== expected.id) fields.push("id");
  if (entry.versao !== expected.versao) fields.push("versao");
  if (entry.nome !== expected.nome) fields.push("nome");
  if ((entry.email ?? undefined) !== (expected.email ?? undefined)) {
    fields.push("email");
  }
  if ((entry.celular ?? undefined) !== (expected.celular ?? undefined)) {
    fields.push("celular");
  }
  if (entry.criadoEm !== expected.criadoEm) fields.push("criadoEm");
  if (entry.atualizadoEm !== expected.atualizadoEm) fields.push("atualizadoEm");
  if (entry.path !== expected.path) fields.push("path");
  return fields;
}

/** Rebuild secondary maps from entries (source of truth). */
export function rebuildClientSecondaryMaps(
  entries: ClientIndexEntry[],
): Pick<ClientIndexState, "byEmail" | "byCelular"> {
  const byEmail: Record<string, string> = {};
  const byCelular: Record<string, string> = {};

  for (const entry of entries) {
    const email = normalizeEmail(entry.email);
    if (email) byEmail[email] = entry.id;
    if (entry.celular) byCelular[entry.celular] = entry.id;
  }

  return { byEmail, byCelular };
}

export function stateFromClientEntries(
  entries: ClientIndexEntry[],
  updatedAt = new Date().toISOString(),
): ClientIndexState {
  const sorted = sortClientIndexEntries(entries);
  return {
    updatedAt,
    entries: sorted,
    ...rebuildClientSecondaryMaps(sorted),
  };
}

export function upsertClientInIndex(
  state: ClientIndexState,
  client: Client,
): ClientIndexState {
  const entry = clientToIndexEntry(client);
  const without = state.entries.filter((e) => e.id !== client.id);
  return stateFromClientEntries([...without, entry], new Date().toISOString());
}

export function removeClientFromIndex(
  state: ClientIndexState,
  clientId: string,
): ClientIndexState {
  if (!state.entries.some((e) => e.id === clientId)) return state;
  return stateFromClientEntries(
    state.entries.filter((e) => e.id !== clientId),
    new Date().toISOString(),
  );
}

export function filterClientIndexEntries(
  entries: readonly ClientIndexEntry[],
  filters?: ClientIndexListFilters,
): ClientIndexEntry[] {
  let items = entries as ClientIndexEntry[];

  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q) ||
        (c.celular ?? "").includes(q),
    );
  }

  return items;
}

export type ClientIndexJsonWrite = { path: string; data: unknown };

export function serializeClientIndexWrites(
  state: ClientIndexState,
): ClientIndexJsonWrite[] {
  const updatedAt = state.updatedAt;
  const total = state.entries.length;
  const writes: ClientIndexJsonWrite[] = [];

  const emailDoc: ClientEmailIndex = {
    schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
    updatedAt,
    byEmail: state.byEmail,
  };
  const celularDoc: ClientCelularIndex = {
    schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
    updatedAt,
    byCelular: state.byCelular,
  };
  writes.push({ path: CLIENT_EMAIL_INDEX_PATH, data: emailDoc });
  writes.push({ path: CLIENT_CELULAR_INDEX_PATH, data: celularDoc });

  if (total <= CLIENT_INDEX_SHARD_THRESHOLD) {
    const manifest: ClientIndexManifest = {
      schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: false,
      entries: state.entries,
    };
    writes.push({ path: CLIENT_INDEX_MANIFEST_PATH, data: manifest });
    return writes;
  }

  const shardSize = CLIENT_INDEX_SHARD_SIZE;
  const shardNames: string[] = [];
  let shardNum = 1;
  for (let i = 0; i < state.entries.length; i += shardSize) {
    const chunk = state.entries.slice(i, i + shardSize);
    const name = `page-${String(shardNum).padStart(3, "0")}.json`;
    shardNames.push(name);
    writes.push({
      path: clientIndexShardPath(shardNum),
      data: {
        schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
        updatedAt,
        shard: shardNum,
        entries: chunk,
      },
    });
    shardNum += 1;
  }

  const meta: ClientIndexManifest = {
    schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
    updatedAt,
    total,
    sharded: true,
    shardSize,
    shards: shardNames,
  };
  writes.push({ path: CLIENT_INDEX_META_PATH, data: meta });

  writes.push({
    path: CLIENT_INDEX_MANIFEST_PATH,
    data: {
      schemaVersion: CLIENT_INDEX_SCHEMA_VERSION,
      updatedAt,
      total,
      sharded: true,
      shardSize,
      shards: shardNames.map((name) => `clientes/${name}`),
    } satisfies ClientIndexManifest,
  });

  return writes;
}

export function parseClientManifestEntries(
  manifest: ClientIndexManifest,
): ClientIndexEntry[] | null {
  if (manifest.entries && !manifest.sharded) {
    return manifest.entries;
  }
  return null;
}

export { emptyClientIndexState, CLIENT_INDEX_MANIFEST_PATH, normalizeEmail };
