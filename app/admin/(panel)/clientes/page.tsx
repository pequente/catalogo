import { ClientesClient } from "@/components/admin/ClientesClient";
import {
  getCachedClientIndex,
  getCachedOrderIndex,
} from "@/src/lib/cache/storefront-reads";
import {
  clientFiltersFromSearchParams,
  filterAndSortClients,
} from "@/src/lib/front/client-filter";
import {
  firstSearchParam,
  normalizePagination,
  paginateItems,
  PAGINATION,
} from "@/src/lib/pagination";
import { indexEntryToClient } from "@/src/schemas/client-index";
import { setListingReadContext } from "@/src/lib/observability/listing-read";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminClientesPage({ searchParams }: Props) {
  const sp = await searchParams;
  const filters = clientFiltersFromSearchParams(sp);
  const { page, pageSize } = normalizePagination(
    {
      page: firstSearchParam(sp.page),
      pageSize: firstSearchParam(sp.pageSize),
    },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );

  const [clientIndex, orderIndex] = await Promise.all([
    getCachedClientIndex(),
    getCachedOrderIndex(),
  ]);
  setListingReadContext({ indexHit: true });

  const items = clientIndex.entries.map(indexEntryToClient);
  const orderClientIds = orderIndex.entries
    .filter((o) => o.status === "confirmado" && o.clienteId)
    .map((o) => o.clienteId as string);
  const orderClientIdSet = new Set(orderClientIds);

  const filtered = filterAndSortClients(items, filters, orderClientIdSet);
  const result = paginateItems(filtered, { page, pageSize });

  return (
    <ClientesClient
      initialItems={result.items}
      orderClientIds={orderClientIds}
      filters={filters}
      total={result.total}
      catalogTotal={items.length}
      page={result.page}
      pageSize={result.pageSize}
    />
  );
}
