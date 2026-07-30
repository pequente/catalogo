import Link from "next/link";
import { FooterContactBlock } from "@/components/public/footerContact";
import { FooterSocialLinks } from "@/components/public/FooterSocialLinks";
import { StoreBrand } from "@/components/public/StoreBrand";
import {
  getSiteNavegacao,
  resolveNavEntries,
} from "@/src/lib/navigation";
import type { Category } from "@/src/schemas/category";
import type { SiteConfig } from "@/src/schemas/site-config";

export type PublicFooterClassNames = {
  footerInner: string;
  footerBrand: string;
  footerBrandName: string;
  footerMuted: string;
  footerLogo: string;
  footerSlogan?: string;
  footerSection: string;
  footerSectionTitle: string;
  footerItem: string;
  footerLabel: string;
  footerSocial: string;
  footerLinks: string;
};

type Props = {
  site: SiteConfig;
  categories: Category[];
  classNames: PublicFooterClassNames;
  /** Gallery layout shows the slogan under the brand. */
  showSlogan?: boolean;
};

export function PublicFooterSections({
  site,
  categories,
  classNames,
  showSlogan = false,
}: Props) {
  const rodape = site.textos.rodape;
  const paginas = site.textos.paginas;
  const showSocial =
    (site.instagram.mostrar && Boolean(site.instagram.url)) ||
    (site.whatsapp.mostrar && Boolean(site.whatsapp.telefone));

  const navLinks = site.comportamento.rodapeUsarNavegacao
    ? resolveNavEntries(
        getSiteNavegacao(site).drawer.itens,
        categories,
      ).filter((entry) => entry.kind === "link")
    : null;

  return (
    <div className={`container ${classNames.footerInner}`}>
      <div className={`${classNames.footerSection} ${classNames.footerBrand}`}>
        <p className={classNames.footerSectionTitle}>{rodape.tituloLoja}</p>
        <StoreBrand
          site={site}
          classNames={{
            name: classNames.footerBrandName,
            tag: classNames.footerMuted,
            logo: classNames.footerLogo,
          }}
        />
        {showSlogan && classNames.footerSlogan && site.slogan.trim() ? (
          <p className={classNames.footerSlogan}>{site.slogan}</p>
        ) : null}
      </div>

      <FooterContactBlock
        site={site}
        classNames={{
          section: classNames.footerSection,
          title: classNames.footerSectionTitle,
          item: classNames.footerItem,
          label: classNames.footerLabel,
          muted: classNames.footerMuted,
        }}
      />

      {showSocial ? (
        <div className={classNames.footerSection}>
          <p className={classNames.footerSectionTitle}>{rodape.tituloRedes}</p>
          <FooterSocialLinks site={site} className={classNames.footerSocial} />
        </div>
      ) : null}

      <div className={classNames.footerSection}>
        <p className={classNames.footerSectionTitle}>{rodape.tituloLinks}</p>
        <nav className={classNames.footerLinks} aria-label={rodape.tituloLinks}>
          {navLinks
            ? navLinks.map((entry) =>
                entry.externo ? (
                  <a
                    key={entry.id}
                    href={entry.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {entry.label}
                  </a>
                ) : (
                  <Link key={entry.id} href={entry.href}>
                    {entry.label}
                  </Link>
                ),
              )
            : [
                <Link key="sobre" href="/sobre">{paginas.sobreTitulo}</Link>,
                <Link key="catalogo" href="/catalogo">
                  {paginas.catalogoTitulo}
                </Link>,
              ]}
        </nav>
      </div>
    </div>
  );
}
