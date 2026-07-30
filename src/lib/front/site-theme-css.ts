import type { SiteConfig } from "@/src/schemas/site-config";
import type { CSSProperties } from "react";

export function siteThemeStyle(site: SiteConfig): CSSProperties {
  const max = site.tema.larguraContainer.trim();
  const container =
    max && /^\d/.test(max)
      ? `min(${max}, calc(100% - 2 * var(--vn-gutter)))`
      : max || "min(1120px, calc(100% - 2 * var(--vn-gutter)))";

  return {
    "--vn-primary": site.cores.primaria,
    "--vn-secondary": site.cores.secundaria,
    "--vn-surface": site.cores.fundo,
    "--vn-muted": site.cores.fundoNeutro,
    "--vn-border": site.cores.borda,
    "--vn-radius": `${site.tema.raio}px`,
    "--vn-container": container,
    "--vn-whatsapp": site.tema.corWhatsapp,
    "--vn-instagram": site.tema.corInstagram,
  } as CSSProperties;
}
