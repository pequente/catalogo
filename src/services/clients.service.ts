import "server-only";
import { cache } from "react";
import {
  listJsonDir,
  readJson,
  commitFiles,
} from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import {
  clientSchema,
  type Client,
  type ClientUpsert,
} from "@/src/schemas/client";
import {
  normalizePagination,
  paginateItems,
  PAGINATION,
  type PaginatedResult,
} from "@/src/lib/pagination";
import { getClientIndexState } from "@/src/lib/indices/client-index-io";
import {
  filterClientIndexEntries,
  normalizeEmail,
} from "@/src/lib/indices/client-index-core";
import { indexEntryToClient } from "@/src/schemas/client-index";
import {
  clientIndexWritesAfterUpsert,
  clientIndexWritesAfterRemove,
  loadClientIndexForMutation,
} from "@/src/lib/indices/client-index-mutate";

const DIR = "clientes";

function pathFor(id: string) {
  return `${DIR}/${id}.json`;
}

/**
 * Full entity scan — repair / migration only.
 * @deprecated Prefer getClientIndexState / listClientsPage for hot paths.
 */
export const listClients = cache(async (): Promise<Client[]> => {
  const files = await listJsonDir(DIR);
  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`${DIR}/${file}`);
      const parsed = clientSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[clients] invalid file ${file}`, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    }),
  );
  return results
    .filter((c): c is Client => c !== null)
    .sort(
      (a, b) =>
        b.atualizadoEm.localeCompare(a.atualizadoEm) ||
        a.nome.localeCompare(b.nome),
    );
});

/** Paginated clients list from the client index (O(shards), not O(N) entity files). */
export async function listClientsPage(opts?: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Client>> {
  const index = await getClientIndexState();
  const items = filterClientIndexEntries(index.entries, { q: opts?.q }).map(
    indexEntryToClient,
  );
  const pagination = normalizePagination(
    { page: opts?.page, pageSize: opts?.pageSize },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );
  return paginateItems(items, pagination);
}

export async function getClient(id: string): Promise<Client | null> {
  const raw = await readJson<unknown>(pathFor(id));
  if (!raw) return null;
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}

async function findByContact(
  email?: string,
  celular?: string,
): Promise<Client | null> {
  const emailNorm = normalizeEmail(email);
  const index = await getClientIndexState();
  let id: string | undefined;
  if (emailNorm) id = index.byEmail[emailNorm];
  if (!id && celular) id = index.byCelular[celular];
  if (!id) return null;
  return getClient(id);
}

export async function upsertClient(input: ClientUpsert): Promise<Client> {
  const email = normalizeEmail(input.email);
  const celular = input.celular;
  const existing = await findByContact(email, celular);
  const now = new Date().toISOString();
  const indexState = await loadClientIndexForMutation();

  if (existing) {
    const updated: Client = {
      ...existing,
      nome: input.nome.trim(),
      email: email ?? existing.email,
      celular: celular ?? existing.celular,
      versao: existing.versao + 1,
      atualizadoEm: now,
    };
    clientSchema.parse(updated);
    const { writes } = clientIndexWritesAfterUpsert(indexState, updated);
    await commitFiles(
      buildMutationFiles({
        jsonWrites: [{ path: pathFor(existing.id), data: updated }, ...writes],
      }),
      `chore(data): update client ${updated.nome}`,
    );
    revalidateStorefront(CACHE_TAGS.clients, CACHE_TAGS.dashboard);
    return updated;
  }

  const id = crypto.randomUUID();
  const client: Client = {
    id,
    versao: 1,
    nome: input.nome.trim(),
    email,
    celular,
    criadoEm: now,
    atualizadoEm: now,
  };
  clientSchema.parse(client);
  const { writes } = clientIndexWritesAfterUpsert(indexState, client);
  await commitFiles(
    buildMutationFiles({
      jsonWrites: [{ path: pathFor(id), data: client }, ...writes],
    }),
    `feat(data): create client ${client.nome}`,
  );
  revalidateStorefront(CACHE_TAGS.clients, CACHE_TAGS.dashboard);
  return client;
}

export async function deleteClient(id: string): Promise<void> {
  const current = await getClient(id);
  if (!current) throw new AppError("NOT_FOUND", "Cliente não encontrado", 404);
  const indexState = await loadClientIndexForMutation();
  const { writes } = clientIndexWritesAfterRemove(indexState, id);
  await commitFiles(
    buildMutationFiles({
      jsonWrites: writes,
      deletes: [pathFor(id)],
    }),
    `chore(data): delete client ${current.nome}`,
  );
  revalidateStorefront(CACHE_TAGS.clients, CACHE_TAGS.dashboard);
}
