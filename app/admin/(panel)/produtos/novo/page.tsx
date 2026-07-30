import { listCategories } from "@/src/services/categories.service";
import { getSiteConfig } from "@/src/services/site-config.service";
import { ProductForm } from "@/components/admin/ProductForm";

/** Empty form + categories only — never loads the product catalog (Fase 4). */
export default async function NovoProdutoPage() {
  const [categories, site] = await Promise.all([
    listCategories(),
    getSiteConfig(),
  ]);
  return (
    <ProductForm
      categories={categories}
      dimensoes={site.rotulos.dimensoes}
    />
  );
}
