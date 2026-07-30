import Link from "next/link";
import { PublicMobileNav } from "../PublicMobileNav";
import type { ChromeProps } from "../types";
import { StoreBrand } from "@/components/public/StoreBrand";
import { CartHeaderButton } from "@/components/public/cart/CartHeaderButton";
import {
  HeaderDesktopNav,
  HeaderDrawerNav,
  HeaderSearchForm,
  HeaderTopbarMeta,
  headerTopbarVisible,
  resolveHeaderNav,
} from "../headerNav";
import styles from "./gallery.module.css";

export function GalleryHeader({ site, categories }: ChromeProps) {
  const {
    headerEntries,
    drawerEntries,
    mobileFooter,
    drawerTitle,
    drawerSubtitle,
    showDrawerSearch,
  } = resolveHeaderNav(site, categories);
  const buscaPlaceholder = site.textos.catalogo.buscaPlaceholder;
  const showTopbar = headerTopbarVisible(site);

  return (
    <header className={styles.header}>
      {showTopbar ? (
        <div className={styles.topbar}>
          <div className={`container ${styles.topbarInner}`}>
            <span className={styles.topbarMeta}>
              <HeaderTopbarMeta
                site={site}
                addressClassName={styles.topbarAddress}
                phoneClassName={styles.topbarPhone}
              />
            </span>
          </div>
        </div>
      ) : null}
      <div className={styles.navBar}>
        <div className={`container ${styles.navInner}`}>
          <Link href="/" className={styles.brand}>
            <StoreBrand
              site={site}
              classNames={{
                name: styles.brandName,
                tag: styles.brandTag,
                logo: styles.brandLogo,
              }}
            />
          </Link>
          {headerEntries.length > 0 ? (
            <nav className={styles.nav} aria-label="Principal">
              <HeaderDesktopNav entries={headerEntries} />
            </nav>
          ) : null}
          <div className={styles.headerActions}>
            <CartHeaderButton
              visible={Boolean(site.mostrarCarrinho)}
              variant="gallery"
              classNames={{
                root: styles.headerCart,
                link: styles.headerCartLink,
                badge: styles.headerCartBadge,
              }}
            />
            <PublicMobileNav
            variant="gallery"
            classNames={{
              root: styles.mobileNav,
              toggle: styles.menuToggle,
              toggleOpen: styles.menuToggleOpen,
            }}
            title={drawerTitle}
            subtitle={drawerSubtitle}
            beforeNav={
              showDrawerSearch ? (
                <HeaderSearchForm placeholder={buscaPlaceholder} />
              ) : undefined
            }
            footer={mobileFooter}
          >
            <HeaderDrawerNav entries={drawerEntries} />
          </PublicMobileNav>
          </div>
        </div>
      </div>
    </header>
  );
}
