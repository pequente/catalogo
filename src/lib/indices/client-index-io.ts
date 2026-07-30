import "server-only";
import { cache } from "react";
import { readJson } from "@/src/lib/data";
import { readEntityDir } from "@/src/lib/indices/read-entity-dir";
import {
  parseClientManifestEntries,
  serializeClientIndexWrites,
  stateFromClientEntries,
  type ClientIndexJsonWrite,
} from "@/src/lib/indices/client-index-core";
import {
  CLIENT_INDEX_MANIFEST_PATH,
  CLIENT_INDEX_META_PATH,
  CLIENT_INDEX_SHARDS_DIR,
  CLIENT_EMAIL_INDEX_PATH,
  CLIENT_CELULAR_INDEX_PATH,
} from "@/src/lib/indices/paths";
import {
  clientIndexEntrySchema,
  clientIndexManifestSchema,
  clientIndexShardSchema,
  clientEmailIndexSchema,
  clientCelularIndexSchema,
  clientToIndexEntry,
  type ClientIndexEntry,
  type ClientIndexState,
  type ClientEmailIndex,
} from "@/src/schemas/client-index";
import { clientSchema } from "@/src/schemas/client";

async function readManifestFile(
  path: string,
): Promise<ReturnType<typeof clientIndexManifestSchema.parse> | null> {
  const raw = await readJson<unknown>(path);
  if (!raw) return null;
  const parsed = clientIndexManifestSchema.safeParse(raw);
  if (!parsed.success) {
    console.warn(
      `[client-index] invalid manifest ${path}`,
      parsed.error.flatten(),
    );
    return null;
  }
  return parsed.data;
}

async function loadEntriesFromShards(
  shardRelativePaths: string[],
): Promise<ClientIndexEntry[]> {
  const chunks = await Promise.all(
    shardRelativePaths.map(async (rel) => {
      const path = rel.startsWith("indices/")
        ? rel
        : rel.startsWith("clientes/")
          ? `indices/${rel}`
          : `${CLIENT_INDEX_SHARDS_DIR}/${rel.replace(/^.*\//, "")}`;
      const raw = await readJson<unknown>(path);
      if (!raw) {
        console.warn(`[client-index] missing shard ${path}`);
        return [] as ClientIndexEntry[];
      }
      const parsed = clientIndexShardSchema.safeParse(raw);
      if (!parsed.success) {
        const entriesRaw = (raw as { entries?: unknown }).entries;
        if (!Array.isArray(entriesRaw)) {
          console.warn(
            `[client-index] invalid shard ${path}`,
            parsed.error.flatten(),
          );
          return [] as ClientIndexEntry[];
        }
        return entriesRaw
          .map((e) => clientIndexEntrySchema.safeParse(e))
          .filter((r) => r.success)
          .map((r) => r.data);
      }
      return parsed.data.entries;
    }),
  );
  return chunks.flat();
}

export async function readClientIndexState(): Promise<ClientIndexState | null> {
  const root = await readManifestFile(CLIENT_INDEX_MANIFEST_PATH);
  if (root) {
    const direct = parseClientManifestEntries(root);
    if (direct) {
      return stateFromClientEntries(direct, root.updatedAt);
    }
    if (root.sharded && root.shards && root.shards.length > 0) {
      const entries = await loadEntriesFromShards(root.shards);
      if (entries.length !== root.total) {
        console.warn(
          `[client-index] shard entry count ${entries.length} !== meta.total ${root.total}`,
        );
      }
      return stateFromClientEntries(entries, root.updatedAt);
    }
  }

  const meta = await readManifestFile(CLIENT_INDEX_META_PATH);
  if (meta?.sharded && meta.shards && meta.shards.length > 0) {
    const entries = await loadEntriesFromShards(
      meta.shards.map((name) =>
        name.includes("/") ? name : `${CLIENT_INDEX_SHARDS_DIR}/${name}`,
      ),
    );
    return stateFromClientEntries(entries, meta.updatedAt);
  }

  return null;
}

export const getClientIndexState = cache(
  async (): Promise<ClientIndexState> => {
    const existing = await readClientIndexState();
    if (existing) return existing;
    console.warn(
      "[client-index] missing — building in-memory from clientes/* (run npm run indices:rebuild to persist)",
    );
    const { state } = await buildClientIndexWritesFromDisk();
    return state;
  },
);

export async function readClientEmailIndex(): Promise<ClientEmailIndex | null> {
  const raw = await readJson<unknown>(CLIENT_EMAIL_INDEX_PATH);
  if (raw) {
    const parsed = clientEmailIndexSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
    console.warn(
      "[client-index] invalid email index",
      parsed.error.flatten(),
    );
  }
  const state = await readClientIndexState();
  if (!state) return null;
  return {
    schemaVersion: 1,
    updatedAt: state.updatedAt,
    byEmail: state.byEmail,
  };
}

export async function readClientCelularIndex() {
  const raw = await readJson<unknown>(CLIENT_CELULAR_INDEX_PATH);
  if (!raw) return null;
  const parsed = clientCelularIndexSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function buildClientIndexWritesFromDisk(): Promise<{
  state: ClientIndexState;
  writes: ClientIndexJsonWrite[];
  fileCount: number;
  skipped: number;
}> {
  const { entities, fileCount, skipped } = await readEntityDir(
    "clientes",
    clientSchema,
    "client-index",
  );

  const entries = entities.map((c) => clientToIndexEntry(c));
  const state = stateFromClientEntries(entries);
  return {
    state,
    writes: serializeClientIndexWrites(state),
    fileCount,
    skipped,
  };
}

export async function validateClientIndexConsistency(
  state?: ClientIndexState | null,
): Promise<{
  ok: boolean;
  indexTotal: number;
  fileCount: number;
  deep: import("@/src/lib/indices/client-index-consistency").ClientIndexConsistencyReport;
}> {
  const { auditClientIndexConsistency } = await import(
    "@/src/lib/indices/client-index-consistency"
  );
  const current = state === undefined ? await readClientIndexState() : state;
  const deep = await auditClientIndexConsistency(current);
  return {
    ok: deep.ok,
    indexTotal: deep.indexTotal,
    fileCount: deep.fileCount,
    deep,
  };
}

export { serializeClientIndexWrites, CLIENT_INDEX_MANIFEST_PATH };
