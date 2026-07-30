import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { formatEnderecoLinha } from "@/src/lib/br/endereco";
import { seoTitleFromTemplate, sobrePageTitle } from "@/src/lib/front/store-copy";
import { waLink } from "@/src/lib/wa";
import { InstagramButton } from "@/components/public/InstagramButton";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";

export const revalidate = 120; // keep in sync with STOREFRONT_REVALIDATE_SECONDS

export async function generateMetadata() {
  const site = await getCachedSiteConfig();
  return {
    title: seoTitleFromTemplate(site, site.textos.paginas.sobreTitulo),
  };
}

export default async function SobrePage() {
  const site = await getCachedSiteConfig();
  const wa = waLink(site.whatsapp.telefone, site.whatsapp.mensagemPadrao);
  const showWa = site.whatsapp.mostrar;
  const showIg = site.instagram.mostrar;
  const paginas = site.textos.paginas;

  return (
    <div className="container sobre-page">
      <h1 className="vn-section-title sobre-page__title">
        {sobrePageTitle(site)}
      </h1>
      <p className="sobre-page__lead">{site.textos.sobre}</p>

      <div className="sobre-page__list">
        <p className="sobre-page__item">
          <span className="sobre-page__label">{paginas.sobreLabelLocal}</span>
          {formatEnderecoLinha(site.endereco)}
        </p>
        <p className="sobre-page__item">
          <span className="sobre-page__label">{paginas.sobreLabelHorarios}</span>
          {site.horarios}
        </p>
        <p className="sobre-page__item">
          <span className="sobre-page__label">{paginas.sobreLabelTrocas}</span>
          {site.textos.trocas}
        </p>
      </div>

      {showWa || showIg ? (
        <div className="sobre-page__cta contact-actions">
          {showWa ? (
            <WhatsAppButton href={wa} waSource="sobre">
              {paginas.sobreCtaWhatsapp}
            </WhatsAppButton>
          ) : null}
          {showIg ? <InstagramButton href={site.instagram.url} /> : null}
        </div>
      ) : null}
    </div>
  );
}
