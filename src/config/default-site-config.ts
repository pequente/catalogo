import { DEFAULT_COMPACT_CART_ITEM_PARTS } from "@/src/lib/wa-compact-template";
import { DEFAULT_CART_WA_TEMPLATE_PARTS } from "@/src/lib/wa-cart-template";
import { DEFAULT_PRODUCT_WA_TEMPLATE_PARTS } from "@/src/lib/wa-product-template";
import {
  DEFAULT_DIMENSOES,
  DEFAULT_SITE_COMPORTAMENTO,
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
import { DEFAULT_NAVEGACAO } from "@/src/schemas/navigation";
import type { SiteConfig } from "@/src/schemas/site-config";

/** Canonical defaults for new installs and `data/configuracoes/*.json` seed. */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  versao: 1,
  nomeLoja: "Minha loja",
  mostrarNomeComLogo: false,
  mostrarCarrinho: true,
  assinatura: "Catálogo online",
  slogan: "Configure sua vitrine no painel admin e comece a vender pelo WhatsApp.",
  layout: "classic",
  cores: {
    primaria: "#111111",
    secundaria: "#111111",
    fundo: "#FFFFFF",
    fundoNeutro: "#F5F5F5",
    borda: "#E5E5E5",
  },
  logo: null,
  whatsapp: {
    telefone: "11999999999",
    mensagemPadrao: "Olá! Vim pelo site e gostaria de saber mais.",
    mensagemProdutoParts: DEFAULT_PRODUCT_WA_TEMPLATE_PARTS,
    mensagemProdutoIncluirReferencia: false,
    mensagemProdutoFormatoItens: "produto",
    mensagemProdutoItemCompactoParts: DEFAULT_COMPACT_CART_ITEM_PARTS,
    mostrar: true,
    mensagemCarrinhoFormatoItens: "produto",
    mensagemCarrinhoParts: DEFAULT_CART_WA_TEMPLATE_PARTS,
    mensagemCarrinhoItemCompactoParts: DEFAULT_COMPACT_CART_ITEM_PARTS,
  },
  instagram: {
    handle: "",
    url: "",
    mostrar: false,
  },
  endereco: {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    texto: "",
    mostrar: false,
  },
  telefones: {
    fixo: "",
    celular: "",
    usarWhatsappComoCelular: true,
    mostrarFixo: false,
    mostrarCelular: true,
  },
  horarios: "Seg–Sex 9h–18h · Sáb 9h–13h",
  textos: {
    sobre:
      "Apresente sua loja aqui. Edite este texto em Admin → Personalização → Geral.",
    trocas:
      "Consulte nossa equipe pelo WhatsApp para trocas e devoluções.",
    paginas: { ...DEFAULT_SITE_TEXTOS_PAGINAS },
    home: { ...DEFAULT_SITE_TEXTOS_HOME },
    catalogo: { ...DEFAULT_SITE_TEXTOS_CATALOGO },
    produto: { ...DEFAULT_SITE_TEXTOS_PRODUTO },
    rodape: { ...DEFAULT_SITE_TEXTOS_RODAPE },
    cookies: { ...DEFAULT_SITE_TEXTOS_COOKIES },
    leadModal: { ...DEFAULT_SITE_TEXTOS_LEAD_MODAL },
    carrinho: { ...DEFAULT_SITE_TEXTOS_CARRINHO },
  },
  rotulos: {
    navCategorias: "Categorias",
    dimensoes: [...DEFAULT_DIMENSOES],
  },
  vitrine: { ...DEFAULT_SITE_VITRINE },
  comportamento: { ...DEFAULT_SITE_COMPORTAMENTO },
  tema: { ...DEFAULT_SITE_TEMA },
  seo: { ...DEFAULT_SITE_SEO },
  navegacao: DEFAULT_NAVEGACAO,
  metaReceitaMensal: null,
  atualizadoEm: "2026-01-01T00:00:00.000Z",
};
