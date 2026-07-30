import type { SiteLayoutId } from "@/src/schemas/site-config";

export type SiteLayoutOption = {
  id: SiteLayoutId;
  nome: string;
  /** Short plain-language summary for layout cards. */
  descricao: string;
  /** Where the main image sits in the home page. */
  impacto: string;
  /** How many banner areas the layout uses. */
  areasResumo: string;
  /** Bullet points for lay users. */
  destaques: string[];
};

export const SITE_LAYOUT_OPTIONS: SiteLayoutOption[] = [
  {
    id: "classic",
    nome: "Clássico",
    descricao:
      "Topo largo com a marca no centro, imagem de fundo e botões de ação.",
    impacto: "A imagem principal fica atrás do nome da loja, no topo da página.",
    areasResumo: "3 áreas de imagem",
    destaques: [
      "Topo com fundo em tela cheia",
      "Faixa no meio da página",
      "Bloco de promoção perto do final",
    ],
  },
  {
    id: "split",
    nome: "Dividido",
    descricao:
      "Metade texto, metade imagem: a foto fica ao lado do nome da loja.",
    impacto: "A imagem principal aparece à direita do texto de boas-vindas.",
    areasResumo: "3 áreas de imagem",
    destaques: [
      "Painel visual ao lado do texto",
      "Faixa no meio da página",
      "Bloco de promoção perto do final",
    ],
  },
  {
    id: "gallery",
    nome: "Galeria",
    descricao:
      "Carrossel no topo com várias fotos que trocam sozinhas.",
    impacto: "Até 6 fotos no topo, em sequência, como um álbum.",
    areasResumo: "1 carrossel (até 6 fotos)",
    destaques: [
      "Carrossel full-bleed no topo",
      "Ordem das fotos = ordem do carrossel",
      "Sem faixa nem promoção neste modelo",
    ],
  },
];

export function getLayoutOption(id: SiteLayoutId): SiteLayoutOption {
  return (
    SITE_LAYOUT_OPTIONS.find((opt) => opt.id === id) ?? SITE_LAYOUT_OPTIONS[0]!
  );
}
