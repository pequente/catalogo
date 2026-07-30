export type ConfiguracoesTabId =
  | "geral"
  | "contato"
  | "whatsapp"
  | "vitrine"
  | "navegacao"
  | "textos"
  | "tema";

export const CONFIGURACOES_TABS: Array<{
  id: ConfiguracoesTabId;
  label: string;
  /** Shorter label for narrow screens (CSS toggles visibility). */
  shortLabel?: string;
}> = [
    {
      id: "geral",
      label: "Geral",
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      shortLabel: "WhatsApp",
    },
    {
      id: "contato",
      shortLabel: "Contato",
      label: "Contato e Endereço",
    },
    {
      id: "vitrine",
      shortLabel: "Vitrine",
      label: "Layout e Banners",
    },
    {
      id: "navegacao",
      label: "Navegação",
    },
    {
      id: "textos",
      label: "Textos",
    },
    {
      id: "tema",
      label: "Tema",
    },
  ];

/** Map legacy `?tab=` values and current ids to a canonical tab. */
export function parseConfigTab(value: string | undefined): ConfiguracoesTabId {
  if (
    value === "contato" ||
    value === "whatsapp" ||
    value === "navegacao" ||
    value === "textos" ||
    value === "tema" ||
    value === "geral"
  ) {
    return value;
  }
  if (
    value === "vitrine" ||
    value === "layout" ||
    value === "banners"
  ) {
    return "vitrine";
  }
  // Legacy Identidade / Painel tabs and Personalização alias
  if (
    value === "identidade" ||
    value === "painel" ||
    value === "personalização" ||
    value === "personalizacao"
  ) {
    return "geral";
  }
  return "geral";
}

export function configTabHref(tab: ConfiguracoesTabId): string {
  return tab === "geral"
    ? "/admin/personalizacao"
    : `/admin/personalizacao?tab=${tab}`;
}
