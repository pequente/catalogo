import "server-only";
import { cache } from "react";
import { commitFiles, listJsonDir, readJson } from "@/src/lib/data";
import { buildMutationFiles } from "@/src/lib/data/commit-mutation";
import { AppError } from "@/src/lib/api/errors";
import { CACHE_TAGS } from "@/src/lib/cache-tags";
import { revalidateStorefront } from "@/src/lib/admin/revalidate-storefront";
import {
  orderSchema,
  type Order,
  type OrderCreate,
  type OrderItem,
  type OrderUpdate,
} from "@/src/schemas/order";
import { productSchema, variantAttr, type Product } from "@/src/schemas/product";
import { variantSellPrice } from "@/src/lib/front/pricing";
import { getClient } from "@/src/services/clients.service";
import { getProductById } from "@/src/services/products.service";
import { normalizeProductReferencia } from "@/src/lib/product-referencia";
import {
  normalizePagination,
  paginateItems,
  PAGINATION,
  type PaginatedResult,
} from "@/src/lib/pagination";
import {
  indexWritesAfterUpsertMany,
  loadProductIndexForMutation,
} from "@/src/lib/indices/product-index-mutate";
import {
  orderIndexWritesAfterUpsert,
  loadOrderIndexForMutation,
} from "@/src/lib/indices/order-index-mutate";
import { getOrderIndexState } from "@/src/lib/indices/order-index-io";
import {
  filterOrderIndexEntries,
} from "@/src/lib/indices/order-index-core";
import { indexEntryToOrder } from "@/src/schemas/order-index";

const DIR = "pedidos";
const PRODUCTS_DIR = "produtos";

function pathFor(id: string) {
  return `${DIR}/${id}.json`;
}

function productPathFor(id: string) {
  return `${PRODUCTS_DIR}/${id}.json`;
}

function variantKey(produtoId: string, varianteId: string) {
  return `${produtoId}:${varianteId}`;
}

type QtyLine = {
  produtoId: string;
  varianteId: string;
  quantidade: number;
};

function aggregateQtys(lines: QtyLine[]): Map<string, QtyLine> {
  const map = new Map<string, QtyLine>();
  for (const line of lines) {
    const key = variantKey(line.produtoId, line.varianteId);
    const prev = map.get(key);
    if (prev) {
      prev.quantidade += line.quantidade;
    } else {
      map.set(key, { ...line });
    }
  }
  return map;
}

/** Positive delta = add stock; negative = deduct. */
type StockDelta = { produtoId: string; varianteId: string; delta: number };

function stockDeltasFromQtys(
  qtys: Map<string, QtyLine>,
  sign: 1 | -1,
): StockDelta[] {
  return [...qtys.values()].map((q) => ({
    produtoId: q.produtoId,
    varianteId: q.varianteId,
    delta: sign * q.quantidade,
  }));
}

function mergeStockDeltas(deltas: StockDelta[]): StockDelta[] {
  const map = new Map<string, StockDelta>();
  for (const d of deltas) {
    const key = variantKey(d.produtoId, d.varianteId);
    const prev = map.get(key);
    if (prev) {
      prev.delta += d.delta;
    } else {
      map.set(key, { ...d });
    }
  }
  return [...map.values()].filter((d) => d.delta !== 0);
}

async function resolveClienteId(
  clienteId: string | null | undefined,
): Promise<string | null | undefined> {
  if (clienteId === undefined) return undefined;
  if (clienteId === null) return null;
  const client = await getClient(clienteId);
  if (!client) {
    throw new AppError("VALIDATION_ERROR", "Cliente não encontrado", 400);
  }
  return clienteId;
}

async function buildOrderItems(
  inputs: OrderCreate["itens"],
): Promise<OrderItem[]> {
  const aggregated = aggregateQtys(inputs);
  const priceHint = new Map<string, number>();
  for (const input of inputs) {
    if (input.precoUnitario === undefined) continue;
    const key = variantKey(input.produtoId, input.varianteId);
    if (!priceHint.has(key)) priceHint.set(key, input.precoUnitario);
  }

  const items: OrderItem[] = [];

  for (const line of aggregated.values()) {
    const product = await getProductById(line.produtoId);
    if (!product) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Produto não encontrado (${line.produtoId})`,
        400,
      );
    }
    const variant = product.variantes.find((v) => v.id === line.varianteId);
    if (!variant) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Variante não encontrada em ${product.nome}`,
        400,
      );
    }

    const key = variantKey(line.produtoId, line.varianteId);
    const precoUnitario =
      priceHint.get(key) ?? variantSellPrice(product, variant);

    items.push({
      produtoId: product.id,
      varianteId: variant.id,
      nomeProduto: product.nome,
      tamanho: variantAttr(variant, "tamanho") ?? "",
      cor: variantAttr(variant, "cor") ?? "",
      ...(variant.sku ? { sku: variant.sku } : {}),
      ...(normalizeProductReferencia(product.referencia)
        ? { referenciaProduto: normalizeProductReferencia(product.referencia) }
        : {}),
      quantidade: line.quantidade,
      precoUnitario,
    });
  }

  return items;
}

type ApplyStockOpts = {
  /** When true, missing products are skipped (cancel path). */
  allowMissingProduct?: boolean;
};

async function applyStockDeltas(
  deltas: StockDelta[],
  opts: ApplyStockOpts = {},
): Promise<{ products: Product[]; slugs: string[] }> {
  const merged = mergeStockDeltas(deltas);
  if (merged.length === 0) return { products: [], slugs: [] };

  const byProduct = new Map<string, StockDelta[]>();
  for (const d of merged) {
    const list = byProduct.get(d.produtoId) ?? [];
    list.push(d);
    byProduct.set(d.produtoId, list);
  }

  const products: Product[] = [];
  const slugs: string[] = [];
  const now = new Date().toISOString();

  for (const [produtoId, productDeltas] of byProduct) {
    const raw = await readJson<unknown>(productPathFor(produtoId));
    if (!raw) {
      if (opts.allowMissingProduct) continue;
      throw new AppError(
        "VALIDATION_ERROR",
        `Produto não encontrado (${produtoId})`,
        400,
      );
    }
    const parsed = productSchema.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        `Produto inválido (${produtoId})`,
        400,
      );
    }
    const product = structuredClone(parsed.data);

    for (const d of productDeltas) {
      const variant = product.variantes.find((v) => v.id === d.varianteId);
      if (!variant) {
        throw new AppError(
          "VALIDATION_ERROR",
          `Variante não encontrada no produto ${product.nome}`,
          400,
        );
      }
      const next = variant.estoque + d.delta;
      if (next < 0) {
        throw new AppError(
          "INSUFFICIENT_STOCK",
          `Estoque insuficiente: ${product.nome} (${Object.values(variant.atributos).join("/")}). Disponível: ${variant.estoque}.`,
          400,
        );
      }
      variant.estoque = next;
    }

    product.versao += 1;
    product.atualizadoEm = now;
    productSchema.parse(product);
    products.push(product);
    slugs.push(product.slug);
  }

  return { products, slugs };
}

async function commitOrderAndProducts(
  order: Order,
  products: Product[],
  message: string,
  slugs: string[],
) {
  const [productIndexState, orderIndexState] = await Promise.all([
    loadProductIndexForMutation(),
    loadOrderIndexForMutation(),
  ]);
  const { writes: productIndexWrites } = indexWritesAfterUpsertMany(
    productIndexState,
    products,
  );
  const { writes: orderIndexWrites } = orderIndexWritesAfterUpsert(
    orderIndexState,
    order,
  );

  await commitFiles(
    buildMutationFiles({
      jsonWrites: [
        { path: pathFor(order.id), data: order },
        ...products.map((p) => ({ path: productPathFor(p.id), data: p })),
        ...productIndexWrites,
        ...orderIndexWrites,
      ],
    }),
    message,
  );

  revalidateStorefront(
    CACHE_TAGS.orders,
    CACHE_TAGS.products,
    CACHE_TAGS.dashboard,
    { productSlugs: slugs },
  );
}

/**
 * Full entity scan — repair / migration only.
 * @deprecated Prefer getOrderIndexState / listOrdersPage for hot paths.
 */
export const listOrders = cache(async (): Promise<Order[]> => {
  const files = await listJsonDir(DIR);
  const results = await Promise.all(
    files.map(async (file) => {
      const raw = await readJson<unknown>(`${DIR}/${file}`);
      const parsed = orderSchema.safeParse(raw);
      if (!parsed.success) {
        console.warn(`[orders] invalid file ${file}`, parsed.error.flatten());
        return null;
      }
      return parsed.data;
    }),
  );
  return results
    .filter((o): o is Order => o !== null)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
});

export async function listOrdersFiltered(opts?: {
  status?: Order["status"];
  canal?: Order["canal"];
  q?: string;
}): Promise<Order[]> {
  const index = await getOrderIndexState();
  return filterOrderIndexEntries(index.entries, opts).map(indexEntryToOrder);
}

/** Paginated orders list from the order index (O(shards), not O(N) entity files). */
export async function listOrdersPage(opts?: {
  status?: Order["status"];
  canal?: Order["canal"];
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<Order>> {
  const items = await listOrdersFiltered(opts);
  const pagination = normalizePagination(
    { page: opts?.page, pageSize: opts?.pageSize },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );
  return paginateItems(items, pagination);
}

export async function getOrder(id: string): Promise<Order | null> {
  const raw = await readJson<unknown>(pathFor(id));
  if (!raw) return null;
  const parsed = orderSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function createOrder(input: OrderCreate): Promise<Order> {
  const clienteId = await resolveClienteId(input.clienteId ?? null);
  const itens = await buildOrderItems(input.itens);
  const qtys = aggregateQtys(itens);
  const { products, slugs } = await applyStockDeltas(
    stockDeltasFromQtys(qtys, -1),
  );

  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    versao: 1,
    status: "confirmado",
    canal: input.canal ?? "whatsapp",
    clienteId: clienteId ?? null,
    ...(input.observacao?.trim()
      ? { observacao: input.observacao.trim() }
      : {}),
    itens,
    criadoEm: now,
    atualizadoEm: now,
  };
  orderSchema.parse(order);

  await commitOrderAndProducts(
    order,
    products,
    `feat(data): create order ${order.id.slice(0, 8)}`,
    slugs,
  );
  return order;
}

export async function updateOrder(
  id: string,
  input: OrderUpdate,
): Promise<Order> {
  const current = await getOrder(id);
  if (!current) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);
  if (current.status === "cancelado") {
    throw new AppError(
      "VALIDATION_ERROR",
      "Pedido cancelado não pode ser editado",
      400,
    );
  }
  if (current.versao !== input.versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }

  const clienteResolved = await resolveClienteId(input.clienteId);
  const itens =
    input.itens !== undefined
      ? await buildOrderItems(input.itens)
      : current.itens;

  const oldQtys = aggregateQtys(current.itens);
  const newQtys = aggregateQtys(itens);
  const keys = new Set([...oldQtys.keys(), ...newQtys.keys()]);
  const deltas: StockDelta[] = [];
  for (const key of keys) {
    const oldQty = oldQtys.get(key)?.quantidade ?? 0;
    const newQty = newQtys.get(key)?.quantidade ?? 0;
    const diff = oldQty - newQty; // positive = restore stock
    if (diff === 0) continue;
    const [produtoId, varianteId] = key.split(":");
    deltas.push({ produtoId, varianteId, delta: diff });
  }

  const { products, slugs } = await applyStockDeltas(deltas);

  const updated: Order = {
    ...current,
    canal: input.canal ?? current.canal,
    clienteId:
      clienteResolved !== undefined ? clienteResolved : current.clienteId,
    observacao:
      input.observacao !== undefined
        ? input.observacao.trim() || undefined
        : current.observacao,
    itens,
    versao: current.versao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  if (!updated.observacao) delete updated.observacao;
  orderSchema.parse(updated);

  await commitOrderAndProducts(
    updated,
    products,
    `chore(data): update order ${id.slice(0, 8)}`,
    slugs,
  );
  return updated;
}

export async function cancelOrder(
  id: string,
  versao: number,
): Promise<Order> {
  const current = await getOrder(id);
  if (!current) throw new AppError("NOT_FOUND", "Pedido não encontrado", 404);
  if (current.status === "cancelado") {
    throw new AppError("VALIDATION_ERROR", "Pedido já está cancelado", 400);
  }
  if (current.versao !== versao) {
    throw new AppError(
      "VERSION_CONFLICT",
      "Versão desatualizada. Recarregue e tente novamente.",
      409,
    );
  }

  const qtys = aggregateQtys(current.itens);
  const { products, slugs } = await applyStockDeltas(
    stockDeltasFromQtys(qtys, 1),
    { allowMissingProduct: true },
  );

  const updated: Order = {
    ...current,
    status: "cancelado",
    versao: current.versao + 1,
    atualizadoEm: new Date().toISOString(),
  };
  orderSchema.parse(updated);

  await commitOrderAndProducts(
    updated,
    products,
    `chore(data): cancel order ${id.slice(0, 8)}`,
    slugs,
  );
  return updated;
}

export function orderTotal(order: Order): number {
  return order.itens.reduce(
    (sum, item) => sum + item.precoUnitario * item.quantidade,
    0,
  );
}

export function orderItemCount(order: Order): number {
  return order.itens.reduce((sum, item) => sum + item.quantidade, 0);
}
