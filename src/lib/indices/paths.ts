/** Relative paths under DATA_ROOT for JSON indices (Fase 2+). */

export const PRODUCT_INDEX_DIR = "indices";

/** Single-manifest layout (catalogs ≤ shard threshold). */
export const PRODUCT_INDEX_MANIFEST_PATH = `${PRODUCT_INDEX_DIR}/produtos.json`;

/** Sharded layout directory + meta. */
export const PRODUCT_INDEX_SHARDS_DIR = `${PRODUCT_INDEX_DIR}/produtos`;
export const PRODUCT_INDEX_META_PATH = `${PRODUCT_INDEX_SHARDS_DIR}/meta.json`;

export const PRODUCT_SLUG_INDEX_PATH = `${PRODUCT_INDEX_DIR}/produtos-by-slug.json`;
export const PRODUCT_REFERENCIA_INDEX_PATH = `${PRODUCT_INDEX_DIR}/produtos-by-referencia.json`;
export const PRODUCT_CATEGORIA_INDEX_PATH = `${PRODUCT_INDEX_DIR}/produtos-by-categoria.json`;

/** Precomputed catalog KPIs for admin dashboard (Fase 4). */
export const DASHBOARD_CATALOG_INDEX_PATH = `${PRODUCT_INDEX_DIR}/dashboard-catalogo.json`;

export function productIndexShardPath(shardNumber: number): string {
  const n = String(shardNumber).padStart(3, "0");
  return `${PRODUCT_INDEX_SHARDS_DIR}/page-${n}.json`;
}

/** Orders index (pedidos) — listing + dashboard. */
export const ORDER_INDEX_MANIFEST_PATH = `${PRODUCT_INDEX_DIR}/pedidos.json`;
export const ORDER_INDEX_SHARDS_DIR = `${PRODUCT_INDEX_DIR}/pedidos`;
export const ORDER_INDEX_META_PATH = `${ORDER_INDEX_SHARDS_DIR}/meta.json`;

export function orderIndexShardPath(shardNumber: number): string {
  const n = String(shardNumber).padStart(3, "0");
  return `${ORDER_INDEX_SHARDS_DIR}/page-${n}.json`;
}

/** Clients index (clientes) — listing + dashboard + contact lookup. */
export const CLIENT_INDEX_MANIFEST_PATH = `${PRODUCT_INDEX_DIR}/clientes.json`;
export const CLIENT_INDEX_SHARDS_DIR = `${PRODUCT_INDEX_DIR}/clientes`;
export const CLIENT_INDEX_META_PATH = `${CLIENT_INDEX_SHARDS_DIR}/meta.json`;
export const CLIENT_EMAIL_INDEX_PATH = `${PRODUCT_INDEX_DIR}/clientes-by-email.json`;
export const CLIENT_CELULAR_INDEX_PATH = `${PRODUCT_INDEX_DIR}/clientes-by-celular.json`;

export function clientIndexShardPath(shardNumber: number): string {
  const n = String(shardNumber).padStart(3, "0");
  return `${CLIENT_INDEX_SHARDS_DIR}/page-${n}.json`;
}
