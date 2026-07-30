import { PublicFooterSections } from "@/components/public/PublicFooterSections";
import type { ChromeProps } from "../types";
import styles from "./classic.module.css";

export function ClassicFooter({ site, categories }: ChromeProps) {
  return (
    <footer className={styles.footer}>
      <PublicFooterSections
        site={site}
        categories={categories}
        classNames={{
          footerInner: styles.footerInner,
          footerBrand: styles.footerBrand,
          footerBrandName: styles.footerBrandName,
          footerMuted: styles.footerMuted,
          footerLogo: styles.footerLogo,
          footerSection: styles.footerSection,
          footerSectionTitle: styles.footerSectionTitle,
          footerItem: styles.footerItem,
          footerLabel: styles.footerLabel,
          footerSocial: styles.footerSocial,
          footerLinks: styles.footerLinks,
        }}
      />
    </footer>
  );
}
