/** Canonical storefront copy defaults — merged into SiteConfig via Zod defaults. */

export const DEFAULT_DIMENSOES = [
  { id: "tamanho", rotulo: "Tamanho" },
  { id: "cor", rotulo: "Cor" },
] as const;

export const DEFAULT_SITE_TEXTOS_PAGINAS = {
  catalogoTitulo: "Catálogo",
  sobreTitulo: "Sobre",
  carrinhoTitulo: "Carrinho",
  notFoundTitulo: "Página não encontrada",
  notFoundTexto: "O conteúdo pode ter sido removido da loja.",
  notFoundCtaInicio: "Ir para o início",
  notFoundCtaCatalogo: "Ver catálogo",
  sobreTituloPrefixo: "Sobre a",
  sobreLabelLocal: "Local",
  sobreLabelHorarios: "Horários",
  sobreLabelTrocas: "Trocas",
  sobreCtaWhatsapp: "Falar no WhatsApp",
};

export const DEFAULT_SITE_TEXTOS_HOME = {
  destaquesTitulo: "Destaques",
  lancamentosTitulo: "Lançamentos",
  fallbackTitulo: "Nossos produtos",
  verColecao: "Ver coleção",
  verTudo: "Ver tudo",
  duvidasTitulo: "Dúvidas?",
  duvidasTexto: "Fale com a loja pelo WhatsApp.",
  whatsappCurto: "WhatsApp",
  whatsappChamar: "Chamar no WhatsApp",
};

export const DEFAULT_SITE_TEXTOS_CATALOGO = {
  buscaPlaceholder: "Buscar produtos…",
  empty: "Nenhum produto encontrado.",
  limparFiltros: "Limpar filtros",
  labelCategoria: "Categoria",
  contagemSingular: "produto",
  contagemPlural: "produtos",
};

export const DEFAULT_SITE_TEXTOS_PRODUTO = {
  badgeNovo: "Novo",
  badgeEsgotado: "Esgotado",
  ctaInteresse: "Tenho interesse",
  ctaCarrinho: "Adicionar ao carrinho",
  selecioneVariante: "Selecione tamanho e cor",
  aPartirDe: "A partir de ",
  estoqueSelecione: "Selecione tamanho e cor",
  estoqueIndisponivel: "Combinação indisponível",
  estoqueUm: "1 disponível",
  estoqueVarios: "{n} disponíveis",
  waSelecioneVariante: "Selecione tamanho e cor para continuar no WhatsApp",
  waEsgotado: "Produto esgotado",
};

export const DEFAULT_SITE_TEXTOS_RODAPE = {
  tituloLoja: "Loja",
  tituloRedes: "Redes",
  tituloLinks: "Links",
  tituloContato: "Contato",
  labelEndereco: "Endereço",
  labelHorarios: "Horários",
  labelTelefone: "Telefone",
};

export const DEFAULT_SITE_TEXTOS_COOKIES = {
  mensagem:
    "Usamos cookies anônimos para entender o uso do site. Sem dados pessoais até você se identificar no WhatsApp.",
  aceitar: "Aceitar",
  recusar: "Recusar",
};

export const DEFAULT_SITE_TEXTOS_LEAD_MODAL = {
  eyebrow: "WhatsApp",
  titulo: "Quase lá",
  descricao: "Só seu nome e um contato — leva segundos.",
  labelNome: "Nome",
  placeholderNome: "Seu nome",
  labelCelular: "Celular",
  placeholderCelular: "(16) 9XXXX-XXXX",
  labelEmail: "E-mail",
  placeholderEmail: "opcional se informar o celular",
  submit: "Continuar no WhatsApp",
};

export const DEFAULT_SITE_TEXTOS_CARRINHO = {
  titulo: "Carrinho",
  emptyTitulo: "Seu carrinho está vazio",
  emptyLead:
    "Escolha tamanho, cor e quantidade nos produtos e monte seu pedido aqui antes de enviar no WhatsApp.",
  esvaziar: "Esvaziar carrinho",
  verCatalogo: "Ver catálogo",
  voltarHome: "Voltar à home",
  limiteWa:
    "A mensagem do WhatsApp pode ficar longa demais. Envie em partes ou remova alguns itens.",
  enviarWhatsapp: "Enviar pedido no WhatsApp",
};

export const DEFAULT_SITE_VITRINE = {
  homeDestaquesLimit: 8,
  homeLancamentosFetchLimit: 16,
  homeLancamentosLimit: 8,
  homeFallbackLimit: 8,
  catalogoPageSizeDefault: 12,
  catalogoPageSizeOptions: [12, 24, 48] as number[],
};

export const DEFAULT_SITE_COMPORTAMENTO = {
  whatsappColetarLead: true,
  rodapeUsarNavegacao: false,
};

export const DEFAULT_SITE_TEMA = {
  raio: 8,
  larguraContainer: "1120px",
  corWhatsapp: "#25D366",
  corInstagram: "#E1306C",
  fonteCorpo: "poppins" as const,
  fonteDisplay: "bebas-neue" as const,
};

export const DEFAULT_SITE_SEO = {
  titleTemplate: "%s · {nomeLoja}",
  idioma: "pt-BR",
};

export const DEFAULT_SITE_ROTULOS = {
  navCategorias: "Categorias",
};

export const DEFAULT_BANNER_CTA = "Ver oferta";
