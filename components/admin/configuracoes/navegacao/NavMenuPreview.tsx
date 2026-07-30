"use client";

import {
  Camera,
  MapPin,
  Menu,
  Phone,
  Search,
  Store,
} from "lucide-react";
import { resolveNavEntries } from "@/src/lib/navigation";
import type { NavSurfaceKey } from "@/src/lib/navigation-admin";
import type { Category } from "@/src/schemas/category";
import type { SiteNavegacao } from "@/src/schemas/navigation";
import styles from "./NavegacaoEditor.module.css";

type Props = {
  nav: SiteNavegacao;
  surfaceKey: NavSurfaceKey;
  categories: Category[];
  /** Shown in preview context (e.g. store name on drawer). */
  storeLabel?: string;
  sticky?: boolean;
};

export function NavMenuPreview({
  nav,
  surfaceKey,
  categories,
  storeLabel = "Sua loja",
  sticky = true,
}: Props) {
  const surface = nav[surfaceKey];
  const entries = resolveNavEntries(surface.itens, categories);
  const showTopbar =
    nav.topbar.mostrarEndereco || nav.topbar.mostrarTelefone;
  const isDrawer = surfaceKey === "drawer";

  return (
    <div
      className={styles.preview}
      style={sticky ? undefined : { position: "static" }}
      aria-label={
        isDrawer
          ? "Prévia do menu do celular"
          : "Prévia do menu do cabeçalho"
      }
    >
      <p className={styles.previewLabel}>
        {isDrawer ? "Como fica no celular" : "Como fica no computador"}
      </p>

      {isDrawer ? (
        <div className={styles.mockPhone}>
          <div className={styles.mockPhoneNotch} aria-hidden />
          <div className={styles.mockPhoneScreen}>
            {showTopbar ? (
              <>
                <span className={styles.mockCallout}>
                  Faixa superior
                </span>
                <div className={styles.mockTopbar}>
                  {nav.topbar.mostrarEndereco ? (
                    <span className={styles.mockTopbarItem}>
                      <MapPin size={11} strokeWidth={2} aria-hidden />
                      Endereço
                    </span>
                  ) : null}
                  {nav.topbar.mostrarTelefone ? (
                    <span className={styles.mockTopbarItem}>
                      <Phone size={11} strokeWidth={2} aria-hidden />
                      Telefone
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className={styles.mockDrawer}>
              {(nav.drawer.extras.mostrarTitulo ||
                nav.drawer.extras.mostrarAssinatura) && (
                <span className={styles.mockCallout}>Topo do menu</span>
              )}
              {nav.drawer.extras.mostrarTitulo ? (
                <div className={styles.mockBrand}>
                  <Store
                    size={14}
                    strokeWidth={1.75}
                    aria-hidden
                    style={{ marginRight: "0.35rem", verticalAlign: "-2px" }}
                  />
                  {storeLabel}
                </div>
              ) : null}
              {nav.drawer.extras.mostrarAssinatura ? (
                <div className={styles.mockTagline}>Assinatura da loja</div>
              ) : null}

              {surface.mostrarBusca ? (
                <>
                  <span className={styles.mockCallout}>Busca</span>
                  <div className={styles.mockSearch}>
                    <Search size={13} strokeWidth={1.75} aria-hidden />
                    Buscar produtos…
                  </div>
                </>
              ) : null}

              <span className={styles.mockCallout}>Links do menu</span>
              {entries.length === 0 ? (
                <p className={styles.mockEmpty}>
                  Nenhum link visível. Adicione ou mostre itens na lista.
                </p>
              ) : (
                <ul className={`${styles.mockLinks} ${styles.mockLinksStack}`}>
                  {entries.map((entry) => (
                    <li
                      key={entry.id}
                      className={
                        entry.kind === "categorias"
                          ? `${styles.mockLink} ${styles.mockLinkCat}`
                          : styles.mockLink
                      }
                    >
                      {entry.kind === "link" ? entry.label : "Categorias"}
                    </li>
                  ))}
                </ul>
              )}

              {(nav.drawer.extras.mostrarWhatsapp ||
                nav.drawer.extras.mostrarInstagram) && (
                <>
                  <span className={styles.mockCallout}>Rodapé do menu</span>
                  <div className={styles.mockDrawerFoot}>
                    {nav.drawer.extras.mostrarWhatsapp ? (
                      <span className={styles.mockFootItem}>WhatsApp</span>
                    ) : null}
                    {nav.drawer.extras.mostrarInstagram ? (
                      <span className={styles.mockFootItem}>
                        <Camera size={12} strokeWidth={1.75} aria-hidden />
                        Instagram
                      </span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.mockBrowser}>
          <div className={styles.mockChrome} aria-hidden>
            <span className={styles.mockDot} />
            <span className={styles.mockDot} />
            <span className={styles.mockDot} />
            <span className={styles.mockUrl}>sualoja.com.br</span>
          </div>

          {showTopbar ? (
            <>
              <span className={styles.mockCallout}>Faixa superior</span>
              <div className={styles.mockTopbar}>
                {nav.topbar.mostrarEndereco ? (
                  <span className={styles.mockTopbarItem}>
                    <MapPin size={11} strokeWidth={2} aria-hidden />
                    Endereço
                  </span>
                ) : null}
                {nav.topbar.mostrarTelefone ? (
                  <span className={styles.mockTopbarItem}>
                    <Phone size={11} strokeWidth={2} aria-hidden />
                    Telefone
                  </span>
                ) : null}
              </div>
            </>
          ) : null}

          <span className={styles.mockCallout}>Cabeçalho</span>
          <div className={styles.mockHeader}>
            <span className={styles.mockLogo} aria-hidden />
            {entries.length === 0 ? (
              <p className={styles.mockEmpty} style={{ margin: 0, flex: 1 }}>
                Sem links visíveis neste menu.
              </p>
            ) : (
              <ul className={styles.mockLinks}>
                {entries.map((entry) => (
                  <li
                    key={entry.id}
                    className={
                      entry.kind === "categorias"
                        ? `${styles.mockLink} ${styles.mockLinkCat}`
                        : styles.mockLink
                    }
                  >
                    {entry.kind === "link" ? entry.label : "Categorias"}
                  </li>
                ))}
              </ul>
            )}
            {surface.mostrarBusca ? (
              <span className={styles.mockSearchIcon} aria-label="Busca">
                <Search size={15} strokeWidth={1.75} />
              </span>
            ) : (
              <span className={styles.mockSearchIcon} aria-hidden>
                <Menu size={15} strokeWidth={1.75} />
              </span>
            )}
          </div>
          <p className={styles.mockBodyHint}>
            No computador, os links ficam na barra horizontal. No celular, o
            mesmo conteúdo pode aparecer no menu lateral (aba “Menu do celular”).
          </p>
        </div>
      )}

      <p className={styles.previewNote}>
        A prévia atualiza na hora. Salve as alterações para publicar na loja.
      </p>
    </div>
  );
}
