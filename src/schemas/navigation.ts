import { z } from "zod";
import { uuidSchema } from "./common";

export const navBuiltinKeySchema = z.enum(["inicio", "catalogo", "sobre"]);
export type NavBuiltinKey = z.infer<typeof navBuiltinKeySchema>;

export const NAV_BUILTIN_LABELS: Record<NavBuiltinKey, string> = {
  inicio: "Início",
  catalogo: "Catálogo",
  sobre: "Sobre",
};

export const NAV_BUILTIN_HREFS: Record<NavBuiltinKey, string> = {
  inicio: "/",
  catalogo: "/catalogo",
  sobre: "/sobre",
};

const navItemBase = {
  id: z.string().min(1),
  visivel: z.boolean().default(true),
};

export const navLinkItemSchema = z.object({
  ...navItemBase,
  tipo: z.literal("link"),
  chave: navBuiltinKeySchema,
  /** Optional label override. */
  rotulo: z.string().optional(),
});

export const navCategoriasItemSchema = z.object({
  ...navItemBase,
  tipo: z.literal("categorias"),
  /**
   * Ordered root category IDs for this surface.
   * `null` = all effectively-active roots in catalog `ordem`.
   */
  categoriaIds: z.array(uuidSchema).nullable().default(null),
  /** Cap how many roots render after ordering. `null` = unlimited. */
  maxRaizes: z.number().int().min(0).max(50).nullable().default(null),
  /** When false, only the selected roots appear (no submenu/accordion children). */
  incluirFilhos: z.boolean().default(true),
});

export const navCustomItemSchema = z.object({
  ...navItemBase,
  tipo: z.literal("custom"),
  rotulo: z.string().min(1).max(80),
  href: z.string().min(1).max(500),
  externo: z.boolean().default(false),
});

export const navItemSchema = z.discriminatedUnion("tipo", [
  navLinkItemSchema,
  navCategoriasItemSchema,
  navCustomItemSchema,
]);
export type NavItem = z.infer<typeof navItemSchema>;
export type NavLinkItem = z.infer<typeof navLinkItemSchema>;
export type NavCategoriasItem = z.infer<typeof navCategoriasItemSchema>;
export type NavCustomItem = z.infer<typeof navCustomItemSchema>;

export const navTopbarSchema = z.object({
  mostrarEndereco: z.boolean().default(true),
  mostrarTelefone: z.boolean().default(true),
});

export const navDrawerExtrasSchema = z.object({
  mostrarTitulo: z.boolean().default(true),
  mostrarAssinatura: z.boolean().default(true),
  /** AND with `site.whatsapp.mostrar` at render time. */
  mostrarWhatsapp: z.boolean().default(true),
  /** AND with `site.instagram.mostrar` at render time. */
  mostrarInstagram: z.boolean().default(true),
});

export const navSurfaceSchema = z.object({
  itens: z.array(navItemSchema).default([]),
  mostrarBusca: z.boolean().default(false),
});

export const siteNavegacaoSchema = z.object({
  topbar: navTopbarSchema.default({
    mostrarEndereco: true,
    mostrarTelefone: true,
  }),
  header: navSurfaceSchema.default({
    itens: [],
    mostrarBusca: false,
  }),
  drawer: navSurfaceSchema
    .extend({
      extras: navDrawerExtrasSchema.default({
        mostrarTitulo: true,
        mostrarAssinatura: true,
        mostrarWhatsapp: true,
        mostrarInstagram: true,
      }),
    })
    .default({
      itens: [],
      mostrarBusca: false,
      extras: {
        mostrarTitulo: true,
        mostrarAssinatura: true,
        mostrarWhatsapp: true,
        mostrarInstagram: true,
      },
    }),
});
export type SiteNavegacao = z.infer<typeof siteNavegacaoSchema>;
export type NavSurface = z.infer<typeof navSurfaceSchema>;

/** Preserves current hardcoded chrome behavior across layouts. */
export const DEFAULT_NAVEGACAO: SiteNavegacao = {
  topbar: {
    mostrarEndereco: true,
    mostrarTelefone: true,
  },
  header: {
    /** Used by layouts with a header search slot (e.g. split). */
    mostrarBusca: true,
    itens: [
      {
        id: "header-link-catalogo",
        tipo: "link",
        chave: "catalogo",
        visivel: true,
      },
      {
        id: "header-categorias",
        tipo: "categorias",
        visivel: true,
        categoriaIds: null,
        maxRaizes: 4,
        incluirFilhos: true,
      },
      {
        id: "header-link-sobre",
        tipo: "link",
        chave: "sobre",
        visivel: true,
      },
    ],
  },
  drawer: {
    mostrarBusca: false,
    extras: {
      mostrarTitulo: true,
      mostrarAssinatura: true,
      mostrarWhatsapp: true,
      mostrarInstagram: true,
    },
    itens: [
      {
        id: "drawer-link-catalogo",
        tipo: "link",
        chave: "catalogo",
        visivel: true,
      },
      {
        id: "drawer-categorias",
        tipo: "categorias",
        visivel: true,
        categoriaIds: null,
        maxRaizes: null,
        incluirFilhos: true,
      },
      {
        id: "drawer-link-sobre",
        tipo: "link",
        chave: "sobre",
        visivel: true,
      },
    ],
  },
};

export function createCustomNavItem(
  partial?: Partial<Pick<NavCustomItem, "rotulo" | "href" | "externo">>,
): NavCustomItem {
  return {
    id: `custom-${crypto.randomUUID()}`,
    tipo: "custom",
    rotulo: partial?.rotulo?.trim() || "Novo link",
    href: partial?.href?.trim() || "/",
    externo: partial?.externo ?? false,
    visivel: true,
  };
}

export function navItemLabel(
  item: NavItem,
  opts?: { categoriasLabel?: string },
): string {
  const categoriasLabel = opts?.categoriasLabel ?? "Categorias";
  if (item.tipo === "link") {
    return item.rotulo?.trim() || NAV_BUILTIN_LABELS[item.chave];
  }
  if (item.tipo === "custom") return item.rotulo;
  return categoriasLabel;
}
