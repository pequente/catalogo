import {
  getCachedActiveCategories,
  getCachedSiteConfig,
} from "@/src/lib/cache/storefront-reads";
import { getLayout } from "@/components/public/layouts";
import { WhatsAppGateProvider } from "@/components/public/WhatsAppGateProvider";
import { CartProvider } from "@/components/public/cart/CartProvider";
import { AnalyticsProvider } from "@/components/public/analytics/AnalyticsProvider";

/** Public shell shares ISR window with page segments. */
export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [site, categories] = await Promise.all([
    getCachedSiteConfig(),
    getCachedActiveCategories(),
  ]);
  const { Header, Footer } = getLayout(site.layout);

  return (
    <AnalyticsProvider cookiesCopy={site.textos.cookies}>
      <WhatsAppGateProvider
        coletarLead={site.comportamento.whatsappColetarLead}
        leadCopy={site.textos.leadModal}
      >
        <CartProvider cartEnabled={Boolean(site.mostrarCarrinho)}>
          <a className="skip-link" href="#conteudo">
            Ir para o conteúdo
          </a>
          <Header site={site} categories={categories} />
          <main id="conteudo">{children}</main>
          <Footer site={site} categories={categories} />
        </CartProvider>
      </WhatsAppGateProvider>
    </AnalyticsProvider>
  );
}
