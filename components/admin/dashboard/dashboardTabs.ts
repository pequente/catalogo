export type DashboardTabId =
  | "resumo"
  | "vendas"
  | "produtos"
  | "clientes"
  | "site";

export const DASHBOARD_TABS: Array<{
  id: DashboardTabId;
  label: string;
  shortLabel: string;
  subtitle: string;
}> = [
  {
    id: "resumo",
    label: "Resumo do período",
    shortLabel: "Resumo",
    subtitle:
      "Visão rápida do intervalo selecionado acima. Use as outras abas para ver detalhes.",
  },
  {
    id: "vendas",
    label: "Vendas e pedidos",
    shortLabel: "Vendas",
    subtitle:
      "Canais, evolução no tempo e pedidos do período selecionado acima.",
  },
  {
    id: "produtos",
    label: "Produtos e estoque",
    shortLabel: "Produtos",
    subtitle:
      "Situação atual da loja (estoque e vitrine) e o que mais vendeu no período.",
  },
  {
    id: "clientes",
    label: "Clientes",
    shortLabel: "Clientes",
    subtitle: "Base de clientes e cadastros no período selecionado acima.",
  },
  {
    id: "site",
    label: "Site e WhatsApp",
    shortLabel: "Site",
    subtitle:
      "Visitas no site e cliques no WhatsApp no período selecionado acima.",
  },
];

const LEGACY_TAB_MAP: Record<string, DashboardTabId> = {
  negocio: "resumo",
  catalogo: "produtos",
  usabilidade: "site",
};

export function parseDashboardTab(value: string | null | undefined): DashboardTabId {
  if (!value) return "resumo";
  if (
    value === "resumo" ||
    value === "vendas" ||
    value === "produtos" ||
    value === "clientes" ||
    value === "site"
  ) {
    return value;
  }
  return LEGACY_TAB_MAP[value] ?? "resumo";
}

export function dashboardTabHref(tab: DashboardTabId): string {
  if (tab === "resumo") return "/admin";
  return `/admin?dash=${tab}`;
}
