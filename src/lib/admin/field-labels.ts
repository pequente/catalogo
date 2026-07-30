/** Rótulos PT para chaves de `fieldErrors` (Zod flatten) no admin. */
const FIELD_LABELS: Record<string, string> = {
  nomeLoja: "Nome da loja",
  assinatura: "Assinatura",
  slogan: "Slogan",
  layout: "Layout da vitrine",
  logo: "Logo",
  instagram: "Instagram",
  "instagram.handle": "Instagram",
  "instagram.url": "Instagram (URL)",
  whatsapp: "WhatsApp",
  "whatsapp.telefone": "Telefone WhatsApp",
  "whatsapp.mensagemPadrao": "Mensagem padrão WhatsApp",
  "whatsapp.mensagemProdutoParts": "Mensagem de produto WhatsApp",
  "whatsapp.mensagemProdutoParts.intro": "Título da mensagem de produto",
  "whatsapp.mensagemProdutoIncluirReferencia":
    "Incluir referência na mensagem de produto",
  "whatsapp.mensagemProdutoFormatoItens": "Formato do item na mensagem de produto",
  "whatsapp.mensagemProdutoItemCompactoParts": "Linha compacta do produto",
  "mostrarCarrinho": "Mostrar carrinho na loja",
  "whatsapp.mensagemCarrinhoFormatoItens": "Formato dos itens no carrinho",
  "whatsapp.mensagemCarrinhoParts": "Mensagem do carrinho WhatsApp",
  "whatsapp.mensagemCarrinhoItemCompactoParts": "Linha compacta do carrinho",
  endereco: "Endereço",
  "endereco.cep": "CEP",
  "endereco.logradouro": "Logradouro",
  "endereco.numero": "Número",
  "endereco.complemento": "Complemento",
  "endereco.bairro": "Bairro",
  "endereco.cidade": "Cidade",
  "endereco.uf": "UF",
  "endereco.texto": "Endereço (texto)",
  telefones: "Telefones",
  "telefones.fixo": "Telefone fixo",
  "telefones.celular": "Celular",
  horarios: "Horário de atendimento",
  textos: "Textos",
  "textos.sobre": "Texto Sobre",
  "textos.trocas": "Texto trocas",
  navegacao: "Navegação",
  nome: "Nome",
  slug: "Slug",
  referencia: "Referência",
  descricao: "Descrição",
  preco: "Preço",
  categoriasIds: "Categorias",
  status: "Status",
  posicao: "Posição",
  ordem: "Ordem",
  imagem: "Imagem",
  ativo: "Ativo",
  email: "E-mail",
  telefone: "Telefone",
};

function humanizeFieldKey(key: string): string {
  const last = key.split(".").pop() ?? key;
  if (last === last.toUpperCase() && last.length <= 4) return last;
  const spaced = last.replace(/([A-Z])/g, " $1").replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).trim();
}

export function adminFieldLabel(fieldKey: string): string {
  if (FIELD_LABELS[fieldKey]) return FIELD_LABELS[fieldKey];
  const dotted = fieldKey.split(".").map((part, i, arr) => {
    const path = arr.slice(0, i + 1).join(".");
    return FIELD_LABELS[path];
  });
  const nested = dotted.filter(Boolean).pop();
  if (nested) return nested;
  return humanizeFieldKey(fieldKey);
}
