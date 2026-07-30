import { z } from "zod";
import {
  DEFAULT_BANNER_CTA,
  DEFAULT_DIMENSOES,
  DEFAULT_SITE_COMPORTAMENTO,
  DEFAULT_SITE_ROTULOS,
  DEFAULT_SITE_SEO,
  DEFAULT_SITE_TEMA,
  DEFAULT_SITE_TEXTOS_CARRINHO,
  DEFAULT_SITE_TEXTOS_CATALOGO,
  DEFAULT_SITE_TEXTOS_COOKIES,
  DEFAULT_SITE_TEXTOS_HOME,
  DEFAULT_SITE_TEXTOS_LEAD_MODAL,
  DEFAULT_SITE_TEXTOS_PAGINAS,
  DEFAULT_SITE_TEXTOS_PRODUTO,
  DEFAULT_SITE_TEXTOS_RODAPE,
  DEFAULT_SITE_VITRINE,
} from "@/src/config/store-copy-defaults";

const dimensaoSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z][a-z0-9_]*$/i, "Use letras, números e underscore"),
  rotulo: z.string().min(1).max(60),
});

export const siteTextosPaginasSchema = z
  .object({
    catalogoTitulo: z.string().min(1),
    sobreTitulo: z.string().min(1),
    carrinhoTitulo: z.string().min(1),
    notFoundTitulo: z.string().min(1),
    notFoundTexto: z.string().min(1),
    notFoundCtaInicio: z.string().min(1),
    notFoundCtaCatalogo: z.string().min(1),
    sobreTituloPrefixo: z.string().min(1),
    sobreLabelLocal: z.string().min(1),
    sobreLabelHorarios: z.string().min(1),
    sobreLabelTrocas: z.string().min(1),
    sobreCtaWhatsapp: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_PAGINAS });

export const siteTextosHomeSchema = z
  .object({
    destaquesTitulo: z.string().min(1),
    lancamentosTitulo: z.string().min(1),
    fallbackTitulo: z.string().min(1),
    verColecao: z.string().min(1),
    verTudo: z.string().min(1),
    duvidasTitulo: z.string().min(1),
    duvidasTexto: z.string().min(1),
    whatsappCurto: z.string().min(1),
    whatsappChamar: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_HOME });

export const siteTextosCatalogoSchema = z
  .object({
    buscaPlaceholder: z.string().min(1),
    empty: z.string().min(1),
    limparFiltros: z.string().min(1),
    labelCategoria: z.string().min(1),
    contagemSingular: z.string().min(1),
    contagemPlural: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_CATALOGO });

export const siteTextosProdutoSchema = z
  .object({
    badgeNovo: z.string().min(1),
    badgeEsgotado: z.string().min(1),
    ctaInteresse: z.string().min(1),
    ctaCarrinho: z.string().min(1),
    selecioneVariante: z.string().min(1),
    aPartirDe: z.string().min(1),
    estoqueSelecione: z.string().min(1),
    estoqueIndisponivel: z.string().min(1),
    estoqueUm: z.string().min(1),
    estoqueVarios: z.string().min(1),
    waSelecioneVariante: z.string().min(1),
    waEsgotado: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_PRODUTO });

export const siteTextosRodapeSchema = z
  .object({
    tituloLoja: z.string().min(1),
    tituloRedes: z.string().min(1),
    tituloLinks: z.string().min(1),
    tituloContato: z.string().min(1),
    labelEndereco: z.string().min(1),
    labelHorarios: z.string().min(1),
    labelTelefone: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_RODAPE });

export const siteTextosCookiesSchema = z
  .object({
    mensagem: z.string().min(1),
    aceitar: z.string().min(1),
    recusar: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_COOKIES });

export const siteTextosLeadModalSchema = z
  .object({
    eyebrow: z.string().min(1),
    titulo: z.string().min(1),
    descricao: z.string().min(1),
    labelNome: z.string().min(1),
    placeholderNome: z.string().min(1),
    labelCelular: z.string().min(1),
    placeholderCelular: z.string().min(1),
    labelEmail: z.string().min(1),
    placeholderEmail: z.string().min(1),
    submit: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_LEAD_MODAL });

export const siteTextosCarrinhoSchema = z
  .object({
    titulo: z.string().min(1),
    emptyTitulo: z.string().min(1),
    emptyLead: z.string().min(1),
    esvaziar: z.string().min(1),
    verCatalogo: z.string().min(1),
    voltarHome: z.string().min(1),
    limiteWa: z.string().min(1),
    enviarWhatsapp: z.string().min(1),
  })
  .default({ ...DEFAULT_SITE_TEXTOS_CARRINHO });

export const siteTextosExtendedSchema = z.object({
  sobre: z.string(),
  trocas: z.string(),
  paginas: siteTextosPaginasSchema,
  home: siteTextosHomeSchema,
  catalogo: siteTextosCatalogoSchema,
  produto: siteTextosProdutoSchema,
  rodape: siteTextosRodapeSchema,
  cookies: siteTextosCookiesSchema,
  leadModal: siteTextosLeadModalSchema,
  carrinho: siteTextosCarrinhoSchema,
});

export const siteRotulosSchema = z
  .object({
    navCategorias: z.string().min(1).default(DEFAULT_SITE_ROTULOS.navCategorias),
    dimensoes: z
      .array(dimensaoSchema)
      .min(1)
      .max(4)
      .default([...DEFAULT_DIMENSOES]),
  })
  .default({
    navCategorias: DEFAULT_SITE_ROTULOS.navCategorias,
    dimensoes: [...DEFAULT_DIMENSOES],
  });

export const siteVitrineSchema = z
  .object({
    homeDestaquesLimit: z.number().int().min(1).max(48),
    homeLancamentosFetchLimit: z.number().int().min(1).max(96),
    homeLancamentosLimit: z.number().int().min(1).max(48),
    homeFallbackLimit: z.number().int().min(1).max(48),
    catalogoPageSizeDefault: z.number().int().min(4).max(100),
    catalogoPageSizeOptions: z.array(z.number().int().min(4).max(100)).min(1).max(6),
  })
  .default({ ...DEFAULT_SITE_VITRINE });

export const siteComportamentoSchema = z
  .object({
    whatsappColetarLead: z.boolean(),
    rodapeUsarNavegacao: z.boolean(),
  })
  .default({ ...DEFAULT_SITE_COMPORTAMENTO });

export const siteFonteIdSchema = z.enum([
  "poppins",
  "inter",
  "bebas-neue",
  "system",
]);

/** Hex color: #RGB, #RGBA, #RRGGBB or #RRGGBBAA (case-insensitive). */
export const siteHexColorSchema = z
  .string()
  .regex(
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/,
    "Use uma cor hexadecimal (#RGB, #RGBA, #RRGGBB ou #RRGGBBAA)",
  );

/**
 * Container max-width: number with optional unit px|rem|em|%.
 * Examples: 1120px, 90%, 70rem
 */
export const siteContainerWidthSchema = z
  .string()
  .min(1)
  .max(20)
  .regex(
    /^\d+(\.\d+)?(px|rem|em|%)?$/i,
    "Use um valor como 1120px, 90% ou 70rem",
  );

export const siteTemaSchema = z
  .object({
    raio: z.number().min(0).max(32),
    larguraContainer: siteContainerWidthSchema,
    corWhatsapp: siteHexColorSchema,
    corInstagram: siteHexColorSchema,
    fonteCorpo: siteFonteIdSchema,
    fonteDisplay: siteFonteIdSchema,
  })
  .default({ ...DEFAULT_SITE_TEMA });

export type SiteFonteId = z.infer<typeof siteFonteIdSchema>;

export const siteSeoSchema = z
  .object({
    titleTemplate: z.string().min(1).max(120),
    idioma: z.string().min(2).max(12),
  })
  .default({ ...DEFAULT_SITE_SEO });

export const bannerCtaDefault = DEFAULT_BANNER_CTA;

export type SiteDimensao = z.infer<typeof dimensaoSchema>;
export type SiteTextosExtended = z.infer<typeof siteTextosExtendedSchema>;
export type SiteRotulos = z.infer<typeof siteRotulosSchema>;
export type SiteVitrine = z.infer<typeof siteVitrineSchema>;
export type SiteComportamento = z.infer<typeof siteComportamentoSchema>;
export type SiteTema = z.infer<typeof siteTemaSchema>;
export type SiteSeo = z.infer<typeof siteSeoSchema>;

/** Merge legacy `textos` with only sobre/trocas into full extended shape. */
export function migrateSiteTextosInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o = raw as Record<string, unknown>;
  const textos = o.textos;
  if (!textos || typeof textos !== "object" || Array.isArray(textos)) return raw;
  const t = textos as Record<string, unknown>;
  if (t.paginas != null) return raw;
  return {
    ...o,
    textos: {
      sobre: t.sobre ?? "",
      trocas: t.trocas ?? "",
      paginas: { ...DEFAULT_SITE_TEXTOS_PAGINAS },
      home: { ...DEFAULT_SITE_TEXTOS_HOME },
      catalogo: { ...DEFAULT_SITE_TEXTOS_CATALOGO },
      produto: { ...DEFAULT_SITE_TEXTOS_PRODUTO },
      rodape: { ...DEFAULT_SITE_TEXTOS_RODAPE },
      cookies: { ...DEFAULT_SITE_TEXTOS_COOKIES },
      leadModal: { ...DEFAULT_SITE_TEXTOS_LEAD_MODAL },
      carrinho: { ...DEFAULT_SITE_TEXTOS_CARRINHO },
      ...t,
    },
  };
}

export function migrateSitePersonalizationInput(raw: unknown): unknown {
  let o = migrateSiteTextosInput(raw) as Record<string, unknown>;
  if (!o || typeof o !== "object" || Array.isArray(o)) return raw;
  o = { ...o };
  if (o.rotulos == null) {
    o.rotulos = {
      navCategorias: DEFAULT_SITE_ROTULOS.navCategorias,
      dimensoes: [...DEFAULT_DIMENSOES],
    };
  }
  if (o.vitrine == null) o.vitrine = { ...DEFAULT_SITE_VITRINE };
  if (o.comportamento == null) o.comportamento = { ...DEFAULT_SITE_COMPORTAMENTO };
  if (o.tema == null) o.tema = { ...DEFAULT_SITE_TEMA };
  if (o.seo == null) o.seo = { ...DEFAULT_SITE_SEO };
  return o;
}
