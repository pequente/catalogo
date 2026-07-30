import type { ImageMeta } from "@/components/admin/ImageField";
import { syncInstagram } from "@/src/lib/instagram";
import { normalizeWaDigits } from "@/src/lib/wa";
import { DEFAULT_COMPACT_CART_ITEM_PARTS } from "@/src/lib/wa-compact-template";
import { DEFAULT_NAVEGACAO } from "@/src/schemas/navigation";
import type { SiteConfig } from "@/src/schemas/site-config";
import type { SiteConfigTabId } from "@/src/schemas/site-config-tabs";

export function normalizeSiteConfig(initial: SiteConfig): SiteConfig {
  return {
    ...initial,
    layout: initial.layout ?? "classic",
    mostrarNomeComLogo: initial.mostrarNomeComLogo ?? false,
    mostrarCarrinho: initial.mostrarCarrinho ?? true,
    navegacao: initial.navegacao ?? structuredClone(DEFAULT_NAVEGACAO),
    endereco: {
      ...initial.endereco,
      cep: initial.endereco.cep ?? "",
      logradouro: initial.endereco.logradouro ?? "",
      numero: initial.endereco.numero ?? "",
      complemento: initial.endereco.complemento ?? "",
      bairro: initial.endereco.bairro ?? "",
      mostrar: initial.endereco.mostrar ?? true,
    },
    telefones: {
      fixo: initial.telefones?.fixo ?? "",
      celular: initial.telefones?.celular ?? "",
      usarWhatsappComoCelular:
        initial.telefones?.usarWhatsappComoCelular ?? true,
      mostrarFixo: initial.telefones?.mostrarFixo ?? false,
      mostrarCelular: initial.telefones?.mostrarCelular ?? true,
    },
    instagram: syncInstagram(initial.instagram),
    metaReceitaMensal: initial.metaReceitaMensal ?? null,
    whatsapp: {
      ...initial.whatsapp,
      mensagemProdutoFormatoItens:
        initial.whatsapp.mensagemProdutoFormatoItens ?? "produto",
      mensagemProdutoItemCompactoParts:
        initial.whatsapp.mensagemProdutoItemCompactoParts ??
        DEFAULT_COMPACT_CART_ITEM_PARTS,
      mensagemCarrinhoFormatoItens:
        initial.whatsapp.mensagemCarrinhoFormatoItens ?? "produto",
      mensagemCarrinhoItemCompactoParts:
        initial.whatsapp.mensagemCarrinhoItemCompactoParts ??
        DEFAULT_COMPACT_CART_ITEM_PARTS,
    },
  };
}

export function logoFromConfig(config: SiteConfig): ImageMeta | null {
  if (!config.logo) return null;
  return {
    id: config.logo.id,
    path: config.logo.path,
    alt: config.logo.alt,
  };
}

function tabFingerprintSlice(
  config: SiteConfig,
  tab: SiteConfigTabId,
  logo: ImageMeta | null,
): unknown {
  switch (tab) {
    case "geral":
      return {
        nomeLoja: config.nomeLoja,
        mostrarNomeComLogo: Boolean(config.mostrarNomeComLogo),
        mostrarCarrinho: Boolean(config.mostrarCarrinho),
        assinatura: config.assinatura,
        slogan: config.slogan,
        cores: config.cores,
        logo: logo
          ? {
              id: logo.id,
              path: logo.path,
              alt: logo.alt ?? "",
              pending: Boolean(logo.file),
            }
          : null,
        metaReceitaMensal: config.metaReceitaMensal ?? null,
      };
    case "whatsapp":
      return {
        whatsapp: {
          telefone: normalizeWaDigits(config.whatsapp.telefone),
          mensagemPadrao: config.whatsapp.mensagemPadrao,
          mensagemProdutoParts: config.whatsapp.mensagemProdutoParts,
          mensagemProdutoIncluirReferencia: Boolean(
            config.whatsapp.mensagemProdutoIncluirReferencia,
          ),
          mensagemProdutoFormatoItens:
            config.whatsapp.mensagemProdutoFormatoItens ?? "produto",
          mensagemProdutoItemCompactoParts:
            config.whatsapp.mensagemProdutoItemCompactoParts,
          mostrar: Boolean(config.whatsapp.mostrar),
          mensagemCarrinhoFormatoItens:
            config.whatsapp.mensagemCarrinhoFormatoItens ?? "produto",
          mensagemCarrinhoParts: config.whatsapp.mensagemCarrinhoParts,
          mensagemCarrinhoItemCompactoParts:
            config.whatsapp.mensagemCarrinhoItemCompactoParts,
        },
        comportamento: config.comportamento,
      };
    case "contato":
      return {
        instagram: syncInstagram({
          handle: config.instagram.handle,
          mostrar: Boolean(config.instagram.mostrar),
        }),
        endereco: {
          cep: config.endereco.cep ?? "",
          logradouro: config.endereco.logradouro ?? "",
          numero: config.endereco.numero ?? "",
          complemento: config.endereco.complemento ?? "",
          bairro: config.endereco.bairro ?? "",
          texto: config.endereco.texto,
          cidade: config.endereco.cidade,
          uf: config.endereco.uf,
          mostrar: Boolean(config.endereco.mostrar),
        },
        telefones: {
          fixo: normalizeWaDigits(config.telefones.fixo),
          celular: normalizeWaDigits(config.telefones.celular),
          usarWhatsappComoCelular: Boolean(
            config.telefones.usarWhatsappComoCelular,
          ),
          mostrarFixo: Boolean(config.telefones.mostrarFixo),
          mostrarCelular: Boolean(config.telefones.mostrarCelular),
        },
        horarios: config.horarios,
      };
    case "vitrine":
      return {
        layout: config.layout ?? "classic",
        vitrine: config.vitrine,
      };
    case "navegacao":
      return {
        navegacao: config.navegacao ?? DEFAULT_NAVEGACAO,
      };
    case "textos":
      return {
        textos: {
          sobre: config.textos.sobre,
          trocas: config.textos.trocas,
          paginas: config.textos.paginas,
          home: config.textos.home,
          catalogo: config.textos.catalogo,
          produto: config.textos.produto,
          rodape: config.textos.rodape,
          cookies: config.textos.cookies,
          leadModal: config.textos.leadModal,
          carrinho: config.textos.carrinho,
        },
        rotulos: config.rotulos,
      };
    case "tema":
      return {
        tema: config.tema,
        seo: config.seo,
      };
    default: {
      const _exhaustive: never = tab;
      return _exhaustive;
    }
  }
}

/** Stable fingerprint for dirty comparison across loaded tabs only. */
export function configFingerprint(
  config: SiteConfig,
  logo: ImageMeta | null,
  loadedTabs: Iterable<SiteConfigTabId> = [
    "geral",
    "whatsapp",
    "contato",
    "vitrine",
    "navegacao",
    "textos",
    "tema",
  ],
): string {
  const tabs = [...loadedTabs].sort();
  const payload: Record<string, unknown> = {};
  for (const tab of tabs) {
    payload[tab] = tabFingerprintSlice(config, tab, logo);
  }
  return JSON.stringify(payload);
}

export function listDirtyTabs(
  config: SiteConfig,
  logo: ImageMeta | null,
  baselineFpByTab: Partial<Record<SiteConfigTabId, string>>,
  loadedTabs: Iterable<SiteConfigTabId>,
): SiteConfigTabId[] {
  const dirty: SiteConfigTabId[] = [];
  for (const tab of loadedTabs) {
    const current = JSON.stringify(tabFingerprintSlice(config, tab, logo));
    if (baselineFpByTab[tab] !== current) dirty.push(tab);
  }
  return dirty;
}

export function tabBaselineFingerprints(
  config: SiteConfig,
  logo: ImageMeta | null,
  tabs: Iterable<SiteConfigTabId>,
): Partial<Record<SiteConfigTabId, string>> {
  const out: Partial<Record<SiteConfigTabId, string>> = {};
  for (const tab of tabs) {
    out[tab] = JSON.stringify(tabFingerprintSlice(config, tab, logo));
  }
  return out;
}
