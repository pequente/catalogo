import {
  DEFAULT_NAVEGACAO,
  type NavItem,
  type SiteNavegacao,
} from "@/src/schemas/navigation";

export type NavSurfaceKey = "header" | "drawer";

function newSurfaceItemId(surfaceKey: NavSurfaceKey): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now()).slice(-8);
  return `${surfaceKey}-item-${suffix}`;
}

/** Semantic fingerprint of a nav item (ignores id). */
function itemFingerprint(item: NavItem): string {
  const vis = item.visivel !== false;
  if (item.tipo === "link") {
    const rotulo = item.rotulo?.trim() ?? "";
    return `link:${item.chave}:${rotulo}:${vis}`;
  }
  if (item.tipo === "custom") {
    return `custom:${item.rotulo}:${item.href}:${item.externo}:${vis}`;
  }
  /* Same menu slot; per-surface category limits stay independent. */
  return `cat:${vis}`;
}

/** True when header and drawer item lists differ in order or content. */
export function surfacesItemsDiffer(nav: SiteNavegacao): boolean {
  const a = nav.header.itens.map(itemFingerprint);
  const b = nav.drawer.itens.map(itemFingerprint);
  if (a.length !== b.length) return true;
  return a.some((fp, i) => fp !== b[i]);
}

function cloneItemForSurface(
  item: NavItem,
  surfaceKey: NavSurfaceKey,
): NavItem {
  const suffix = newSurfaceItemId(surfaceKey).replace(`${surfaceKey}-item-`, "");
  const base = { ...item, id: `${surfaceKey}-item-${suffix}` };
  if (item.tipo === "link") {
    return { ...base, tipo: "link" as const, chave: item.chave, rotulo: item.rotulo };
  }
  if (item.tipo === "custom") {
    return {
      ...base,
      tipo: "custom" as const,
      rotulo: item.rotulo,
      href: item.href,
      externo: item.externo,
    };
  }
  return {
    ...base,
    tipo: "categorias" as const,
    categoriaIds:
      item.categoriaIds == null ? null : [...item.categoriaIds],
    maxRaizes: item.maxRaizes,
    incluirFilhos: item.incluirFilhos,
  };
}

/** Copy items from one surface to the other (new ids on target). */
export function copySurfaceItems(
  nav: SiteNavegacao,
  from: NavSurfaceKey,
  to: NavSurfaceKey,
  options?: { includeSearch?: boolean },
): SiteNavegacao {
  if (from === to) return nav;
  const source = nav[from];
  const cloned = source.itens.map((item) => cloneItemForSurface(item, to));
  const patch: Partial<SiteNavegacao["header"]> = { itens: cloned };
  if (options?.includeSearch) {
    patch.mostrarBusca = source.mostrarBusca;
  }
  if (to === "header") {
    return {
      ...nav,
      header: { ...nav.header, ...patch, itens: patch.itens ?? nav.header.itens },
    };
  }
  return {
    ...nav,
    drawer: {
      ...nav.drawer,
      ...patch,
      itens: patch.itens ?? nav.drawer.itens,
      extras: nav.drawer.extras,
    },
  };
}

export function resetSurfaceToDefault(
  nav: SiteNavegacao,
  surfaceKey: NavSurfaceKey,
): SiteNavegacao {
  const def = JSON.parse(
    JSON.stringify(DEFAULT_NAVEGACAO[surfaceKey]),
  ) as SiteNavegacao[NavSurfaceKey];
  if (surfaceKey === "header") {
    return { ...nav, header: def };
  }
  return { ...nav, drawer: def as SiteNavegacao["drawer"] };
}

export function navItemKindLabel(item: NavItem): string {
  if (item.tipo === "link") return "Página do site";
  if (item.tipo === "custom") return item.externo ? "Link externo" : "Link personalizado";
  return "Suas categorias";
}
