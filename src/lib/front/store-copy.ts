import type { SiteConfig } from "@/src/schemas/site-config";
import { DEFAULT_SITE_TEXTOS_PRODUTO } from "@/src/config/store-copy-defaults";

export function formatEstoqueVarios(template: string, n: number): string {
  return template.replace("{n}", String(n));
}

export function catalogoContagemLabel(site: SiteConfig, total: number): string {
  const t = site.textos.catalogo;
  const word = total === 1 ? t.contagemSingular : t.contagemPlural;
  return `${total} ${word}`;
}

export function sobrePageTitle(site: SiteConfig): string {
  const p = site.textos.paginas;
  return `${p.sobreTituloPrefixo} ${site.nomeLoja}`;
}

export function seoTitleFromTemplate(
  site: SiteConfig,
  pageTitle: string | undefined,
): string {
  if (!pageTitle?.trim()) {
    return `${site.nomeLoja} — ${site.assinatura}`;
  }
  return site.seo.titleTemplate
    .replace("%s", pageTitle)
    .replace("{nomeLoja}", site.nomeLoja);
}

export function dimensaoRotulo(site: SiteConfig, id: string): string {
  const found = site.rotulos.dimensoes.find(
    (d) => d.id.toLowerCase() === id.toLowerCase(),
  );
  return found?.rotulo ?? id;
}

export function selecioneVarianteFromDims(
  dimensoes: Array<{ id: string; rotulo: string }>,
  fallback: string,
): string {
  if (dimensoes.length === 0) return fallback;
  if (dimensoes.length === 1) {
    return `Selecione ${dimensoes[0].rotulo.toLowerCase()}`;
  }
  const parts = dimensoes.map((d) => d.rotulo.toLowerCase());
  if (parts.length === 2) {
    return `Selecione ${parts[0]} e ${parts[1]}`;
  }
  return `Selecione ${parts.slice(0, -1).join(", ")} e ${parts[parts.length - 1]}`;
}

export function selecioneVarianteCopy(site: SiteConfig): string {
  return selecioneVarianteFromDims(
    site.rotulos.dimensoes,
    site.textos.produto.selecioneVariante,
  );
}

export function produtoCopy(
  site: SiteConfig,
  key: keyof typeof DEFAULT_SITE_TEXTOS_PRODUTO,
): string {
  if (key === "selecioneVariante" || key === "estoqueSelecione") {
    return selecioneVarianteCopy(site);
  }
  return site.textos.produto[key];
}
