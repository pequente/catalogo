import {
  ConfiguredDesktopNav,
  ConfiguredDrawerNav,
} from "@/components/public/CategoryNav";
import { InstagramButton } from "@/components/public/InstagramButton";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import {
  getSiteNavegacao,
  resolveSurfaceEntries,
  type ResolvedNavEntry,
} from "@/src/lib/navigation";
import { formatEnderecoLinha } from "@/src/lib/br/endereco";
import { formatBrWhatsApp, waLink } from "@/src/lib/wa";
import type { Category } from "@/src/schemas/category";
import type { SiteConfig } from "@/src/schemas/site-config";
import type { SiteNavegacao } from "@/src/schemas/navigation";
import type { ReactNode } from "react";

export function headerTopbarVisible(site: SiteConfig): boolean {
  const { topbar } = getSiteNavegacao(site);
  const address =
    topbar.mostrarEndereco && formatEnderecoLinha(site.endereco).trim();
  const phone = topbar.mostrarTelefone && site.whatsapp.telefone.trim();
  return Boolean(address || phone);
}

export function HeaderTopbarMeta({
  site,
  addressClassName,
  phoneClassName,
}: {
  site: SiteConfig;
  addressClassName?: string;
  phoneClassName?: string;
}) {
  const { topbar } = getSiteNavegacao(site);
  const address = topbar.mostrarEndereco
    ? formatEnderecoLinha(site.endereco).trim()
    : "";
  const phone = topbar.mostrarTelefone
    ? formatBrWhatsApp(site.whatsapp.telefone)
    : "";
  if (!address && !phone) return null;
  return (
    <>
      {address ? <span className={addressClassName}>{address}</span> : null}
      {phone ? <span className={phoneClassName}>{phone}</span> : null}
    </>
  );
}

export function HeaderSearchForm({
  className,
  placeholder,
}: {
  className?: string;
  placeholder: string;
}) {
  return (
    <form className={className} action="/catalogo" method="get" role="search">
      <input
        type="search"
        name="q"
        placeholder={placeholder}
        aria-label={placeholder}
        enterKeyHint="search"
      />
      <button type="submit" aria-label="Buscar">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path
            d="M20 20l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}

export type HeaderNavResolved = {
  nav: SiteNavegacao;
  headerEntries: ResolvedNavEntry[];
  drawerEntries: ResolvedNavEntry[];
  mobileFooter: ReactNode;
  drawerTitle?: string;
  drawerSubtitle?: string;
  showHeaderSearch: boolean;
  showDrawerSearch: boolean;
};

export function resolveHeaderNav(
  site: SiteConfig,
  categories: Category[],
): HeaderNavResolved {
  const nav = getSiteNavegacao(site);
  const headerEntries = resolveSurfaceEntries(site, "header", categories);
  const drawerEntries = resolveSurfaceEntries(site, "drawer", categories);
  const showWa =
    Boolean(site.whatsapp.mostrar) && Boolean(nav.drawer.extras.mostrarWhatsapp);
  const showIg =
    Boolean(site.instagram.mostrar) &&
    Boolean(nav.drawer.extras.mostrarInstagram);
  const wa = waLink(site.whatsapp.telefone, site.whatsapp.mensagemPadrao);

  const mobileFooter: ReactNode =
    showWa || showIg ? (
      <div className="contact-actions">
        {showWa ? (
          <WhatsAppButton
            href={wa}
            waSource="mobile_nav"
            className="btn btn-whatsapp"
          >
            WhatsApp
          </WhatsAppButton>
        ) : null}
        {showIg ? <InstagramButton href={site.instagram.url} /> : null}
      </div>
    ) : undefined;

  return {
    nav,
    headerEntries,
    drawerEntries,
    mobileFooter,
    drawerTitle: nav.drawer.extras.mostrarTitulo ? site.nomeLoja : undefined,
    drawerSubtitle: nav.drawer.extras.mostrarAssinatura
      ? site.assinatura
      : undefined,
    showHeaderSearch: nav.header.mostrarBusca,
    showDrawerSearch: nav.drawer.mostrarBusca,
  };
}

export function HeaderDesktopNav({ entries }: { entries: ResolvedNavEntry[] }) {
  if (entries.length === 0) return null;
  return <ConfiguredDesktopNav entries={entries} />;
}

export function HeaderDrawerNav({ entries }: { entries: ResolvedNavEntry[] }) {
  return <ConfiguredDrawerNav entries={entries} />;
}
