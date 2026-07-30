import "server-only";
import { commitFiles } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import {
  buildClientIndexWritesFromDisk,
  readClientIndexState,
  validateClientIndexConsistency,
} from "@/src/lib/indices/client-index-io";
import {
  serializeClientIndexWrites,
  upsertClientInIndex,
  removeClientFromIndex,
  type ClientIndexJsonWrite,
} from "@/src/lib/indices/client-index-core";
import type { ClientIndexState } from "@/src/schemas/client-index";
import type { Client } from "@/src/schemas/client";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";

export async function loadClientIndexForMutation(): Promise<ClientIndexState> {
  const existing = await readClientIndexState();
  if (existing) return existing;
  console.warn(
    "[client-index] index missing during mutation — rebuilding from clientes/*",
  );
  const { state } = await buildClientIndexWritesFromDisk();
  return state;
}

export function clientIndexWritesAfterUpsert(
  state: ClientIndexState,
  client: Client,
): { state: ClientIndexState; writes: ClientIndexJsonWrite[] } {
  const next = upsertClientInIndex(state, client);
  return { state: next, writes: serializeClientIndexWrites(next) };
}

export function clientIndexWritesAfterRemove(
  state: ClientIndexState,
  clientId: string,
): { state: ClientIndexState; writes: ClientIndexJsonWrite[] } {
  const next = removeClientFromIndex(state, clientId);
  return { state: next, writes: serializeClientIndexWrites(next) };
}

export async function rebuildAndCommitClientIndices(message?: string): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  const { state, writes, fileCount, skipped } =
    await buildClientIndexWritesFromDisk();
  await commitFiles(
    buildMutationFiles({ jsonWrites: writes }),
    message ?? "chore(data): rebuild client indices",
  );
  const consistency = await validateClientIndexConsistency(state);
  revalidateStorefront(CACHE_TAGS.clients, CACHE_TAGS.dashboard);
  return {
    total: state.entries.length,
    fileCount,
    skipped,
    ok: consistency.ok,
    deepIssues: consistency.deep.issues.length,
  };
}

export async function repairClientIndices(): Promise<{
  total: number;
  fileCount: number;
  skipped: number;
  ok: boolean;
  deepIssues?: number;
}> {
  return rebuildAndCommitClientIndices(
    "fix(data): repair client indices from entity JSON",
  );
}
