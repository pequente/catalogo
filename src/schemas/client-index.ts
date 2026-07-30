import { z } from "zod";
import type { Client } from "@/src/schemas/client";
import { isoDateSchema, uuidSchema } from "./common";

/** Bump when index entry shape or file layout changes incompatibly. */
export const CLIENT_INDEX_SCHEMA_VERSION = 1 as const;

export const CLIENT_INDEX_SHARD_SIZE = 500;
export const CLIENT_INDEX_SHARD_THRESHOLD = 1500;

export const clientIndexEntrySchema = z.object({
  id: uuidSchema,
  versao: z.number().int().min(1),
  nome: z.string().min(1).max(120),
  email: z.string().email().max(160).optional(),
  celular: z.string().min(10).max(11).optional(),
  criadoEm: isoDateSchema,
  atualizadoEm: isoDateSchema,
  /** Relative entity path, e.g. `clientes/{id}.json`. */
  path: z.string().min(1),
});

export type ClientIndexEntry = z.infer<typeof clientIndexEntrySchema>;

export const clientIndexManifestSchema = z.object({
  schemaVersion: z.literal(CLIENT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  total: z.number().int().min(0),
  sharded: z.boolean().optional(),
  shardSize: z.number().int().positive().optional(),
  shards: z.array(z.string().min(1)).optional(),
  entries: z.array(clientIndexEntrySchema).optional(),
});

export type ClientIndexManifest = z.infer<typeof clientIndexManifestSchema>;

export const clientIndexShardSchema = z.object({
  schemaVersion: z.literal(CLIENT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  shard: z.number().int().min(1),
  entries: z.array(clientIndexEntrySchema),
});

export type ClientIndexShard = z.infer<typeof clientIndexShardSchema>;

export const clientEmailIndexSchema = z.object({
  schemaVersion: z.literal(CLIENT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  /** Keys are lowercased emails. */
  byEmail: z.record(z.string(), z.string().uuid()),
});

export type ClientEmailIndex = z.infer<typeof clientEmailIndexSchema>;

export const clientCelularIndexSchema = z.object({
  schemaVersion: z.literal(CLIENT_INDEX_SCHEMA_VERSION),
  updatedAt: z.string().min(1),
  byCelular: z.record(z.string(), z.string().uuid()),
});

export type ClientCelularIndex = z.infer<typeof clientCelularIndexSchema>;

/** In-memory working set used by readers and atomic mutation helpers. */
export type ClientIndexState = {
  updatedAt: string;
  entries: ClientIndexEntry[];
  byEmail: Record<string, string>;
  byCelular: Record<string, string>;
};

export function clientEntityPath(id: string): string {
  return `clientes/${id}.json`;
}

/** Build a lean index entry from a full Client entity. */
export function clientToIndexEntry(client: Client): ClientIndexEntry {
  return {
    id: client.id,
    versao: client.versao,
    nome: client.nome,
    ...(client.email ? { email: client.email } : {}),
    ...(client.celular ? { celular: client.celular } : {}),
    criadoEm: client.criadoEm,
    atualizadoEm: client.atualizadoEm,
    path: clientEntityPath(client.id),
  };
}

/** Strip path for Client-compatible listing DTOs. */
export function indexEntryToClient(entry: ClientIndexEntry): Client {
  const { path: _path, ...client } = entry;
  void _path;
  return client;
}

export function emptyClientIndexState(
  updatedAt = new Date().toISOString(),
): ClientIndexState {
  return {
    updatedAt,
    entries: [],
    byEmail: {},
    byCelular: {},
  };
}

/** Sort newest-atualizado first (matches legacy listClients). */
export function sortClientIndexEntries(
  entries: ClientIndexEntry[],
): ClientIndexEntry[] {
  return [...entries].sort((a, b) => {
    const byDate = b.atualizadoEm.localeCompare(a.atualizadoEm);
    if (byDate !== 0) return byDate;
    return a.nome.localeCompare(b.nome);
  });
}
