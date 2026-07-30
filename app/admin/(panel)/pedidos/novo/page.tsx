import {
  getCachedClients,
  getCachedProductsByIds,
} from "@/src/lib/cache/storefront-reads";
import {
  PedidoForm,
  type PedidoInitialLine,
} from "@/components/admin/PedidoForm";
import { variantSellPrice } from "@/src/lib/front/pricing";
import type { Product } from "@/src/schemas/product";

type Props = {
  searchParams: Promise<{ itens?: string | string[] }>;
};

function parseItensParam(
  raw: string | string[] | undefined,
  products: Product[],
): PedidoInitialLine[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value?.trim()) return [];

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lines: PedidoInitialLine[] = [];

  for (const token of value.split(",")) {
    const [produtoId, varianteId, qtyRaw] = token.split(":");
    if (!produtoId || !varianteId || !qtyRaw) continue;
    const quantidade = Number.parseInt(qtyRaw, 10);
    if (!Number.isFinite(quantidade) || quantidade < 1) continue;
    const product = productMap.get(produtoId);
    const variant = product?.variantes.find((v) => v.id === varianteId);
    if (!product || !variant) continue;
    lines.push({
      produtoId,
      varianteId,
      quantidade,
      precoUnitario: variantSellPrice(product, variant),
    });
  }

  return lines;
}

function collectIdsFromItensParam(raw: string | string[] | undefined): string[] {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value?.trim()) return [];
  const ids: string[] = [];
  for (const token of value.split(",")) {
    const [produtoId] = token.split(":");
    if (produtoId) ids.push(produtoId);
  }
  return ids;
}

export default async function NovoPedidoPage({ searchParams }: Props) {
  const params = await searchParams;
  const seedIds = collectIdsFromItensParam(params.itens);
  const [products, clients] = await Promise.all([
    getCachedProductsByIds(seedIds),
    getCachedClients(),
  ]);
  const initialLines = parseItensParam(params.itens, products);

  return (
    <PedidoForm
      products={products}
      clients={clients}
      title="Novo pedido"
      description="Informe os itens vendidos para dar baixa no estoque. Cliente é opcional (loja física sem cadastro)."
      initialLines={initialLines.length > 0 ? initialLines : undefined}
    />
  );
}
