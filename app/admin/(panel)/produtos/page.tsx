import Link from "next/link";
import { listCachedProductListItems } from "@/src/lib/cache/storefront-reads";
import { isEffectivelyActive } from "@/src/lib/categories-tree";
import { listCategories } from "@/src/services/categories.service";
import { formatBrl, mediaUrl } from "@/src/lib/front/format";
import {
  estimateJsonPayloadBytes,
  runWithListingReadMetrics,
} from "@/src/lib/observability/listing-read";
import { AdminNavRow } from "@/components/admin/AdminNavRow";
import { AdminPageActions } from "@/components/admin/AdminPageActions";
import { DeleteProductButton } from "@/components/admin/DeleteProductButton";
import { PaginationNav } from "@/components/ui/PaginationNav";
import {
  buildPageSizeSelectOptions,
  firstSearchParam,
  normalizePagination,
  PAGE_SIZE_OPTIONS_ADMIN,
  PAGINATION,
  parseOptionalBooleanParam,
} from "@/src/lib/pagination";
import { productStatusSchema } from "@/src/schemas/product";
import type { ProductListItem } from "@/src/schemas/product-list";
import { uuidSchema } from "@/src/schemas/common";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const PRODUCT_STATUS_LABEL: Record<ProductListItem["status"], string> = {
  ativo: "Ativo",
  oculto: "Oculto",
  esgotado: "Esgotado",
};

function productStatusLabel(status: ProductListItem["status"]): string {
  return PRODUCT_STATUS_LABEL[status] ?? status;
}

function ThumbPlaceholder() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" />
      <path d="M12 12 3.5 7.5M12 12l8.5-4.5M12 12v9" />
    </svg>
  );
}

function ProductThumb({ img }: { img: string | null }) {
  return (
    <div className="product-cell__thumb">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumb; media URLs
        <img src={img} alt="" />
      ) : (
        <ThumbPlaceholder />
      )}
    </div>
  );
}

function ProductBadges({ product }: { product: ProductListItem }) {
  const ref = product.referencia?.trim();
  if (!product.destaque && !product.lancamento && !ref) {
    return <span className="product-cell__sub">{product.slug}</span>;
  }
  return (
    <div className="product-cell__tags">
      {ref ? (
        <span className="product-cell__sub">Ref. {ref}</span>
      ) : !product.destaque && !product.lancamento ? (
        <span className="product-cell__sub">{product.slug}</span>
      ) : null}
      {product.destaque ? <span className="tag-chip">Destaque</span> : null}
      {product.lancamento ? (
        <span className="tag-chip tag-chip--red">Novo</span>
      ) : null}
    </div>
  );
}

function ProductPrice({
  preco,
  promo,
}: {
  preco: number;
  promo: number | null | undefined;
}) {
  return (
    <div className="admin-table__price">
      {formatBrl(promo ?? preco)}
      {promo != null ? <s>{formatBrl(preco)}</s> : null}
    </div>
  );
}

function buildProdutosHref(opts: {
  page?: number;
  pageSize: number;
  q?: string;
  status?: string;
  categoria?: string;
  destaque?: boolean;
}) {
  const params = new URLSearchParams();
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.pageSize !== PAGINATION.ADMIN_DEFAULT_PAGE_SIZE) {
    params.set("pageSize", String(opts.pageSize));
  }
  if (opts.q?.trim()) params.set("q", opts.q.trim());
  if (opts.status) params.set("status", opts.status);
  if (opts.categoria) params.set("categoria", opts.categoria);
  if (opts.destaque === true) params.set("destaque", "1");
  const qs = params.toString();
  return qs ? `/admin/produtos?${qs}` : "/admin/produtos";
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = firstSearchParam(sp.q)?.trim() || undefined;
  const statusRaw = firstSearchParam(sp.status);
  const statusParsed = statusRaw
    ? productStatusSchema.safeParse(statusRaw)
    : null;
  const status = statusParsed?.success ? statusParsed.data : undefined;
  const categoriaRaw = firstSearchParam(sp.categoria)?.trim();
  const categoriaParsed = categoriaRaw
    ? uuidSchema.safeParse(categoriaRaw)
    : null;
  const categoria = categoriaParsed?.success ? categoriaParsed.data : undefined;
  const destaque = parseOptionalBooleanParam(sp.destaque) === true ? true : undefined;
  const { page, pageSize } = normalizePagination(
    {
      page: firstSearchParam(sp.page),
      pageSize: firstSearchParam(sp.pageSize),
    },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );

  const [{ result }, categories] = await Promise.all([
    runWithListingReadMetrics(
      {
        label: "admin.produtos.listing",
        route: "/admin/produtos",
        page,
        pageSize,
        estimateHtmlBytes: (pageResult) =>
          // RSC document ≈ DTO JSON + chrome; alert uses 500 KB threshold on this estimate.
          Math.round(estimateJsonPayloadBytes(pageResult) * 1.8),
      },
      () =>
        listCachedProductListItems({
          page,
          pageSize,
          q,
          status,
          categoria,
          ...(destaque ? { destaque: true } : {}),
        }),
    ),
    listCategories(),
  ]);
  const activeCategories = categories.filter((c) =>
    isEffectivelyActive(c, categories),
  );
  const catMap = new Map(activeCategories.map((c) => [c.id, c.nome]));

  const rows = result.items.map((p) => {
    const img = mediaUrl(p.capa?.path);
    const categorias =
      p.categoriasIds
        .map((id) => catMap.get(id))
        .filter(Boolean)
        .join(", ") || "—";
    return { product: p, img, stock: p.estoqueTotal, categorias };
  });

  const filterBase = { pageSize, q, status, categoria, destaque };
  const hasFilters = Boolean(q || status || categoria || destaque);

  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="admin-page__intro">
          <p className="admin-page__eyebrow">Catálogo</p>
          <h1 className="admin-page__title">Produtos</h1>
          <p className="admin-page__desc">
            Gerencie preços, status e variantes do catálogo da loja.
          </p>
        </div>
        <AdminPageActions>
          <Link className="btn btn-primary btn-icon" href="/admin/produtos/novo">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.25"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Novo produto
          </Link>
        </AdminPageActions>
      </header>

      <section className="admin-panel" aria-label="Lista de produtos">
        <div className="admin-panel__head">
          <h2>Listagem</h2>
          <span>
            {result.total === 1
              ? "1 produto"
              : `${result.total} produtos`}
            {hasFilters ? " (filtrado)" : ""}
          </span>
        </div>

        <form className="admin-panel__filters admin-panel__filters--bar" method="get">
          <label className="admin-filter-field admin-filter-field--search">
            <span className="admin-filter-field__label">Buscar</span>
            <span className="admin-filter-field__control admin-filter-field__control--search">
              <input
                className="input"
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Nome, slug ou referência"
                autoComplete="off"
              />
            </span>
          </label>
          <label className="admin-filter-field">
            <span className="admin-filter-field__label">Status</span>
            <span className="admin-filter-field__control">
              <select
                className="select"
                name="status"
                defaultValue={status ?? ""}
              >
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="oculto">Oculto</option>
                <option value="esgotado">Esgotado</option>
              </select>
            </span>
          </label>
          <label className="admin-filter-field">
            <span className="admin-filter-field__label">Categoria</span>
            <span className="admin-filter-field__control">
              <select
                className="select"
                name="categoria"
                defaultValue={categoria ?? ""}
              >
                <option value="">Todas</option>
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label className="admin-filter-field">
            <span className="admin-filter-field__label">Destaque</span>
            <span className="admin-filter-field__control">
              <select
                className="select"
                name="destaque"
                defaultValue={destaque ? "1" : ""}
              >
                <option value="">Todos</option>
                <option value="1">Somente destaque</option>
              </select>
            </span>
          </label>
          {pageSize !== PAGINATION.ADMIN_DEFAULT_PAGE_SIZE ? (
            <input type="hidden" name="pageSize" value={pageSize} />
          ) : null}
          <button type="submit" className="btn btn-quiet btn-sm">
            Filtrar
          </button>
        </form>

        {result.total === 0 ? (
          <div className="admin-empty">
            <span className="admin-empty__icon">
              <ThumbPlaceholder />
            </span>
            <strong>
              {hasFilters
                ? "Nenhum produto com esses filtros"
                : "Nenhum produto ainda"}
            </strong>
            <p>
              {hasFilters
                ? "Ajuste a busca ou limpe os filtros."
                : "Cadastre o primeiro item do catálogo para aparecer na vitrine."}
            </p>
            {!hasFilters ? (
              <Link className="btn btn-primary btn-sm btn-icon" href="/admin/produtos/novo">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo produto
              </Link>
            ) : (
              <Link className="btn btn-quiet btn-sm" href="/admin/produtos">
                Limpar filtros
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="admin-table-wrap product-list-desktop admin-panel__body--flush">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Categorias</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ product: p, img, stock, categorias }) => (
                    <AdminNavRow
                      key={p.id}
                      href={`/admin/produtos/${p.id}`}
                      label={`Produto ${p.nome}`}
                    >
                      <td>
                        <div className="product-cell">
                          <ProductThumb img={img} />
                          <div className="product-cell__meta">
                            <span className="product-cell__name" title={p.nome}>
                              {p.nome}
                            </span>
                            <ProductBadges product={p} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="tag-chip tag-chip--soft" title={categorias}>
                          {categorias}
                        </span>
                      </td>
                      <td>
                        <ProductPrice preco={p.preco} promo={p.precoPromocional} />
                      </td>
                      <td>
                        <span className="product-cell__sub">
                          {stock} un. · {p.variantesCount} var.
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${p.status}`}>
                          {productStatusLabel(p.status)}
                        </span>
                      </td>
                      <td>
                        <div className="admin-table__actions">
                          <DeleteProductButton id={p.id} />
                        </div>
                      </td>
                    </AdminNavRow>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="product-list product-list-mobile admin-panel__body--flush">
              {rows.map(({ product: p, img, stock, categorias }) => (
                <li key={p.id} className="product-card">
                  <Link
                    href={`/admin/produtos/${p.id}`}
                    className="product-card__link"
                    aria-label={`Produto ${p.nome}`}
                  >
                    <ProductThumb img={img} />
                    <div className="product-card__body">
                      <div className="product-card__title-row">
                        <div className="product-cell__meta">
                          <span className="product-cell__name" title={p.nome}>
                            {p.nome}
                          </span>
                          <ProductBadges product={p} />
                        </div>
                        <span className={`status-pill status-pill--${p.status}`}>
                          {productStatusLabel(p.status)}
                        </span>
                      </div>
                      <div className="product-card__meta">
                        <ProductPrice preco={p.preco} promo={p.precoPromocional} />
                        <span className="product-card__meta-sep" aria-hidden>
                          ·
                        </span>
                        <span className="product-cell__sub">
                          {stock} un. · {p.variantesCount} var.
                        </span>
                        <span className="product-card__meta-sep" aria-hidden>
                          ·
                        </span>
                        <span className="product-card__cats" title={categorias}>
                          {categorias}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="product-card__actions">
                    <DeleteProductButton id={p.id} />
                  </div>
                </li>
              ))}
            </ul>

            <PaginationNav
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              label="Produtos"
              hrefForPage={(p) => buildProdutosHref({ ...filterBase, page: p })}
              pageSizeOptions={buildPageSizeSelectOptions(
                PAGE_SIZE_OPTIONS_ADMIN,
                result.pageSize,
                (size) =>
                  buildProdutosHref({ ...filterBase, page: 1, pageSize: size }),
              )}
            />
          </>
        )}
      </section>
    </div>
  );
}
