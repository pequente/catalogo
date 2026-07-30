import type { BannerPosicao } from "@/src/schemas/banner";
import type { SiteLayoutId } from "@/src/schemas/site-config";

export type LayoutBannerSlot = {
  posicao: BannerPosicao;
  label: string;
  hint: string;
  /** Plain-language “where this shows on the home page”. */
  ondeAparece: string;
  /** Recommended pixel size shown to merchants. */
  dimensaoIdeal: string;
  /** CSS aspect-ratio string for visual guides (e.g. "16 / 9"). */
  aspectRatio: string;
  /** Whether this slot shows a clickable CTA button (vs whole-image link). */
  temBotao: boolean;
  maxItems: number;
  required: boolean;
};

export const LAYOUT_BANNER_SLOTS: Record<SiteLayoutId, LayoutBannerSlot[]> = {
  classic: [
    {
      posicao: "hero",
      label: "Topo da loja",
      hint: "Imagem de fundo no topo da página inicial. Dimensão ideal: 1920 × 800 px.",
      ondeAparece:
        "Fica atrás do nome e dos botões, bem no começo da página inicial.",
      dimensaoIdeal: "1920 × 800 px",
      aspectRatio: "12 / 5",
      temBotao: true,
      maxItems: 1,
      required: false,
    },
    {
      posicao: "faixa",
      label: "Faixa intermediária",
      hint: "Faixa larga no meio da página. Dimensão ideal: 1200 × 360 px.",
      ondeAparece:
        "Aparece no meio da home, entre as seções de produtos. Toda a imagem é clicável.",
      dimensaoIdeal: "1200 × 360 px",
      aspectRatio: "10 / 3",
      temBotao: false,
      maxItems: 1,
      required: false,
    },
    {
      posicao: "promo",
      label: "Promoção",
      hint: "Bloco de oferta perto do final da página. Dimensão ideal: 1200 × 675 px (16:9).",
      ondeAparece:
        "Bloco perto do final da home, com imagem e um botão de oferta.",
      dimensaoIdeal: "1200 × 675 px (16:9)",
      aspectRatio: "16 / 9",
      temBotao: true,
      maxItems: 1,
      required: false,
    },
  ],
  split: [
    {
      posicao: "hero",
      label: "Topo da loja",
      hint: "Painel visual à direita do hero. Prefira retrato ou quadrado. Ideal: 1200 × 1400 px.",
      ondeAparece:
        "Fica à direita do texto de boas-vindas (no celular, acima do texto).",
      dimensaoIdeal: "1200 × 1400 px (retrato)",
      aspectRatio: "6 / 7",
      temBotao: true,
      maxItems: 1,
      required: false,
    },
    {
      posicao: "faixa",
      label: "Faixa intermediária",
      hint: "Faixa larga no meio da página. Dimensão ideal: 1200 × 360 px.",
      ondeAparece:
        "Aparece no meio da home, entre as seções de produtos. Toda a imagem é clicável.",
      dimensaoIdeal: "1200 × 360 px",
      aspectRatio: "10 / 3",
      temBotao: false,
      maxItems: 1,
      required: false,
    },
    {
      posicao: "promo",
      label: "Promoção",
      hint: "Bloco de oferta perto do final da página. Dimensão ideal: 1200 × 675 px (16:9).",
      ondeAparece:
        "Bloco perto do final da home, com imagem e um botão de oferta.",
      dimensaoIdeal: "1200 × 675 px (16:9)",
      aspectRatio: "16 / 9",
      temBotao: true,
      maxItems: 1,
      required: false,
    },
  ],
  gallery: [
    {
      posicao: "hero",
      label: "Carrossel da home",
      hint: "Slides do carrossel no topo. Dimensão ideal: 1920 × 1080 px. Até 6 imagens.",
      ondeAparece:
        "Fotos que trocam no topo da página. A ordem aqui é a ordem do carrossel.",
      dimensaoIdeal: "1920 × 1080 px",
      aspectRatio: "16 / 9",
      temBotao: true,
      maxItems: 6,
      required: false,
    },
  ],
};

export function getBannerSlotsForLayout(
  layout: SiteLayoutId | undefined | null,
): LayoutBannerSlot[] {
  if (layout && layout in LAYOUT_BANNER_SLOTS) {
    return LAYOUT_BANNER_SLOTS[layout];
  }
  return LAYOUT_BANNER_SLOTS.classic;
}

export function getSlotDef(
  layout: SiteLayoutId | undefined | null,
  posicao: BannerPosicao,
): LayoutBannerSlot | undefined {
  return getBannerSlotsForLayout(layout).find((s) => s.posicao === posicao);
}

/** Max items the published layout allows for a position (0 if unused). */
export function getPublishedSlotCapacity(
  publishedLayout: SiteLayoutId | undefined | null,
  posicao: BannerPosicao,
): number {
  return getSlotDef(publishedLayout, posicao)?.maxItems ?? 0;
}
