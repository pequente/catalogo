import {
  getCachedClientIndex,
  getCachedOrderIndex,
} from "@/src/lib/cache/storefront-reads";
import { PedidosClient } from "@/components/admin/PedidosClient";
import {
  firstSearchParam,
  normalizePagination,
  paginateItems,
  PAGINATION,
} from "@/src/lib/pagination";
import { orderCanalSchema, orderStatusSchema } from "@/src/schemas/order";
import { filterOrderIndexEntries } from "@/src/lib/indices/order-index-core";
import { indexEntryToOrder } from "@/src/schemas/order-index";
import { indexEntryToClient } from "@/src/schemas/client-index";
import { setListingReadContext } from "@/src/lib/observability/listing-read";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminPedidosPage({ searchParams }: Props) {
  const sp = await searchParams;
  const statusRaw = firstSearchParam(sp.status);
  const canalRaw = firstSearchParam(sp.canal);
  const statusParsed = statusRaw
    ? orderStatusSchema.safeParse(statusRaw)
    : null;
  const canalParsed = canalRaw ? orderCanalSchema.safeParse(canalRaw) : null;
  const status = statusParsed?.success ? statusParsed.data : undefined;
  const canal = canalParsed?.success ? canalParsed.data : undefined;
  const { page, pageSize } = normalizePagination(
    {
      page: firstSearchParam(sp.page),
      pageSize: firstSearchParam(sp.pageSize),
    },
    { defaultPageSize: PAGINATION.ADMIN_DEFAULT_PAGE_SIZE },
  );

  const [orderIndex, clientIndex] = await Promise.all([
    getCachedOrderIndex(),
    getCachedClientIndex(),
  ]);
  setListingReadContext({ indexHit: true });

  const filtered = filterOrderIndexEntries(orderIndex.entries, {
    status,
    canal,
  });
  const result = paginateItems(filtered, { page, pageSize });
  const items = result.items.map(indexEntryToOrder);

  const pageClientIds = new Set(
    items.map((o) => o.clienteId).filter(Boolean) as string[],
  );
  const clientsForPage = clientIndex.entries
    .filter((c) => pageClientIds.has(c.id))
    .map(indexEntryToClient);

  return (
    <PedidosClient
      initialItems={items}
      clients={clientsForPage}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      statusFilter={status ?? ""}
      canalFilter={canal ?? ""}
    />
  );
}
