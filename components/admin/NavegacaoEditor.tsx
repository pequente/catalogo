"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Copy,
  MapPinned,
  MessageCircle,
  Monitor,
  PanelTop,
  RotateCcw,
  Smartphone,
  Store,
} from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { FieldHint } from "@/components/admin/FieldHint";
import { NavMenuList } from "@/components/admin/configuracoes/navegacao/NavMenuList";
import { NavMenuPreview } from "@/components/admin/configuracoes/navegacao/NavMenuPreview";
import styles from "@/components/admin/configuracoes/navegacao/NavegacaoEditor.module.css";
import {
  copySurfaceItems,
  resetSurfaceToDefault,
  surfacesItemsDiffer,
  type NavSurfaceKey,
} from "@/src/lib/navigation-admin";
import {
  DEFAULT_NAVEGACAO,
  type NavItem,
  type SiteNavegacao,
} from "@/src/schemas/navigation";
import type { Category } from "@/src/schemas/category";

type Props = {
  value: SiteNavegacao;
  categories: Category[];
  storeLabel?: string;
  disabled?: boolean;
  onChange: (next: SiteNavegacao) => void;
};

function ensureNavegacao(value: SiteNavegacao | undefined): SiteNavegacao {
  return value ?? JSON.parse(JSON.stringify(DEFAULT_NAVEGACAO));
}

function countVisible(itens: NavItem[]): number {
  return itens.filter((i) => i.visivel !== false).length;
}

const SURFACES: Array<{
  id: NavSurfaceKey;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "header",
    label: "Cabeçalho",
    description: "Barra no topo do computador",
    icon: Monitor,
  },
  {
    id: "drawer",
    label: "Menu do celular",
    description: "Lista que abre pelo botão ☰",
    icon: Smartphone,
  },
];

function OptionSwitch({
  title,
  hint,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  const titleId = useId();
  return (
    <div className={styles.optionCard}>
      <div className={styles.optionCopy}>
        <p id={titleId} className={styles.optionTitle}>
          {title}
        </p>
        <p className={styles.optionHint}>{hint}</p>
      </div>
      <label className="admin-switch" data-disabled={disabled ? "true" : undefined}>
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-labelledby={titleId}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="admin-switch__track" aria-hidden="true" />
      </label>
    </div>
  );
}

export function NavegacaoEditor({
  value,
  categories,
  storeLabel,
  disabled,
  onChange,
}: Props) {
  const nav = ensureNavegacao(value);
  const tabsId = useId();
  const { confirm } = useConfirm();
  const [surfaceKey, setSurfaceKey] = useState<NavSurfaceKey>("header");
  const [copyIncludeSearch, setCopyIncludeSearch] = useState(false);
  const menusDiffer = surfacesItemsDiffer(nav);
  const otherSurface: NavSurfaceKey =
    surfaceKey === "header" ? "drawer" : "header";
  const otherLabel =
    otherSurface === "header" ? "cabeçalho" : "menu do celular";

  function patchSurface(
    key: NavSurfaceKey,
    patch: Partial<SiteNavegacao["header"]> & {
      extras?: SiteNavegacao["drawer"]["extras"];
    },
  ) {
    if (key === "header") {
      onChange({
        ...nav,
        header: {
          ...nav.header,
          ...patch,
          itens: patch.itens ?? nav.header.itens,
        },
      });
      return;
    }
    onChange({
      ...nav,
      drawer: {
        ...nav.drawer,
        ...patch,
        itens: patch.itens ?? nav.drawer.itens,
        extras: patch.extras ?? nav.drawer.extras,
      },
    });
  }

  function setItens(key: NavSurfaceKey, itens: NavItem[]) {
    patchSurface(key, { itens });
  }

  function onSurfaceKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = SURFACES.findIndex((s) => s.id === surfaceKey);
    if (idx < 0) return;
    let next = idx;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      next = (idx + 1) % SURFACES.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      next = (idx - 1 + SURFACES.length) % SURFACES.length;
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = SURFACES.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const nextId = SURFACES[next]?.id;
    if (nextId) setSurfaceKey(nextId);
    const btn = document.getElementById(`${tabsId}-tab-${nextId}`);
    btn?.focus();
  }

  async function handleReset() {
    const ok = await confirm({
      title: "Restaurar menu padrão?",
      description: `Isso substitui os links e opções do ${
        surfaceKey === "header" ? "cabeçalho" : "menu do celular"
      } pelos valores iniciais. A faixa superior não muda.`,
      confirmLabel: "Restaurar",
      cancelLabel: "Cancelar",
      tone: "danger",
    });
    if (!ok) return;
    onChange(resetSurfaceToDefault(nav, surfaceKey));
  }

  const activeSurface = nav[surfaceKey];

  return (
    <div className={styles.shell}>
      <section className={styles.card} aria-labelledby={`${tabsId}-topbar`}>
        <header className={styles.cardHeader}>
          <span className={styles.cardIcon} aria-hidden>
            <PanelTop size={18} strokeWidth={1.75} />
          </span>
          <div>
            <h3 id={`${tabsId}-topbar`} className={styles.cardTitle}>
              Faixa superior
            </h3>
            <p className={styles.cardDesc}>
              Linha fina acima do cabeçalho.
            </p>
            <p className={styles.where}>
              <span className={styles.whereMark} aria-hidden>
                <MapPinned size={12} strokeWidth={2} />
              </span>
              Acima do logo — desktop e celular
            </p>
          </div>
        </header>
        <div className={`${styles.optionGrid} ${styles.optionGrid2}`}>
          <OptionSwitch
            title="Endereço"
            hint="Mostra o endereço cadastrado em Contato."
            checked={nav.topbar.mostrarEndereco}
            disabled={disabled}
            onChange={(mostrarEndereco) =>
              onChange({
                ...nav,
                topbar: { ...nav.topbar, mostrarEndereco },
              })
            }
          />
          <OptionSwitch
            title="Telefone"
            hint="Mostra o telefone cadastrado em Contato."
            checked={nav.topbar.mostrarTelefone}
            disabled={disabled}
            onChange={(mostrarTelefone) =>
              onChange({
                ...nav,
                topbar: { ...nav.topbar, mostrarTelefone },
              })
            }
          />
        </div>
      </section>

      <div
        className={styles.surfaceNav}
        role="tablist"
        aria-label="Onde editar o menu"
        onKeyDown={onSurfaceKeyDown}
      >
        {SURFACES.map((tab) => {
          const active = surfaceKey === tab.id;
          const Icon = tab.icon;
          const visibleCount = countVisible(nav[tab.id].itens);
          const showDot = menusDiffer && !active;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tabsId}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${tabsId}-panel`}
              tabIndex={active ? 0 : -1}
              className={[
                styles.surfaceBtn,
                active ? styles.surfaceBtnActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSurfaceKey(tab.id)}
            >
              <span className={styles.surfaceIcon} aria-hidden>
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span className={styles.surfaceCopy}>
                <span className={styles.surfaceLabelRow}>
                  <span className={styles.surfaceLabel}>{tab.label}</span>
                  <span className={styles.surfaceCount} title="Links visíveis">
                    {visibleCount}
                  </span>
                  {showDot ? (
                    <span
                      className={styles.surfaceDot}
                      title="Links diferentes do outro menu"
                      aria-hidden
                    />
                  ) : null}
                </span>
                <span className={styles.surfaceDesc}>{tab.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-tab-${surfaceKey}`}
        className={styles.workspace}
      >
        <div className={styles.editorCol}>
          <details className={styles.previewMobile}>
            <summary className={styles.previewMobileSummary}>
              Ver prévia
            </summary>
            <div className={styles.previewMobileBody}>
              <NavMenuPreview
                nav={nav}
                surfaceKey={surfaceKey}
                categories={categories}
                storeLabel={storeLabel}
                sticky={false}
              />
            </div>
          </details>

          <div className={styles.panel}>
            <p className={styles.sectionTitle}>Opções deste menu</p>
            <p className={styles.sectionLead}>
              {surfaceKey === "header"
                ? "Barra do topo no computador."
                : "Menu aberto no celular."}
            </p>

            <div className={styles.optionGrid}>
              <OptionSwitch
                title="Busca de produtos"
                hint={
                  surfaceKey === "header"
                    ? "Ícone de lupa no canto direito do cabeçalho."
                    : "Campo de busca no topo da lista do menu."
                }
                checked={activeSurface.mostrarBusca}
                disabled={disabled}
                onChange={(mostrarBusca) =>
                  patchSurface(surfaceKey, { mostrarBusca })
                }
              />
            </div>

            {surfaceKey === "drawer" ? (
              <>
                <div className={styles.fieldGroup} style={{ marginTop: "0.35rem" }}>
                  <p className={styles.fieldGroupTitle}>
                    <Store
                      size={12}
                      strokeWidth={2}
                      aria-hidden
                      style={{ marginRight: "0.35rem", verticalAlign: "-1px" }}
                    />
                    Topo do menu
                  </p>
                  <div className={`${styles.optionGrid} ${styles.optionGrid2}`}>
                    <OptionSwitch
                      title="Nome da loja"
                      hint="Título no alto do menu lateral."
                      checked={nav.drawer.extras.mostrarTitulo}
                      disabled={disabled}
                      onChange={(mostrarTitulo) =>
                        patchSurface("drawer", {
                          extras: {
                            ...nav.drawer.extras,
                            mostrarTitulo,
                          },
                        })
                      }
                    />
                    <OptionSwitch
                      title="Assinatura"
                      hint="Frase curta abaixo do nome da loja."
                      checked={nav.drawer.extras.mostrarAssinatura}
                      disabled={disabled}
                      onChange={(mostrarAssinatura) =>
                        patchSurface("drawer", {
                          extras: {
                            ...nav.drawer.extras,
                            mostrarAssinatura,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <p className={styles.fieldGroupTitle}>
                    <MessageCircle
                      size={12}
                      strokeWidth={2}
                      aria-hidden
                      style={{ marginRight: "0.35rem", verticalAlign: "-1px" }}
                    />
                    Rodapé do menu
                  </p>
                  <div className={`${styles.optionGrid} ${styles.optionGrid2}`}>
                    <OptionSwitch
                      title="WhatsApp"
                      hint="Botão no fim do menu (se o WhatsApp estiver ativo)."
                      checked={nav.drawer.extras.mostrarWhatsapp}
                      disabled={disabled}
                      onChange={(mostrarWhatsapp) =>
                        patchSurface("drawer", {
                          extras: {
                            ...nav.drawer.extras,
                            mostrarWhatsapp,
                          },
                        })
                      }
                    />
                    <OptionSwitch
                      title="Instagram"
                      hint="Link do Instagram no fim do menu."
                      checked={nav.drawer.extras.mostrarInstagram}
                      disabled={disabled}
                      onChange={(mostrarInstagram) =>
                        patchSurface("drawer", {
                          extras: {
                            ...nav.drawer.extras,
                            mostrarInstagram,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <div className={styles.panel}>
            <p className={styles.sectionTitle}>Links do menu</p>
            <p className={styles.sectionLead}>
              Ordem na barra (desktop) ou de cima para baixo (celular). Itens
              ocultos não entram na loja.
            </p>
            <NavMenuList
              surfaceKey={surfaceKey}
              itens={activeSurface.itens}
              categories={categories}
              disabled={disabled}
              onChange={(itens) => setItens(surfaceKey, itens)}
            />
          </div>

          {menusDiffer ? (
            <div className={styles.copyBanner} role="status">
              <p>
                Os links deste menu são diferentes do {otherLabel}. Você pode
                copiar a lista de um para o outro para ficar igual.
              </p>
              <label className={styles.copyOpt}>
                <input
                  type="checkbox"
                  checked={copyIncludeSearch}
                  disabled={disabled}
                  onChange={(e) => setCopyIncludeSearch(e.target.checked)}
                />
                <span>
                  Incluir também a opção de busca
                  <FieldHint text="Se marcado, a busca do outro menu é copiada junto com os links." />
                </span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={disabled}
                onClick={() =>
                  onChange(
                    copySurfaceItems(nav, otherSurface, surfaceKey, {
                      includeSearch: copyIncludeSearch,
                    }),
                  )
                }
              >
                <Copy
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                  style={{ marginRight: "0.35rem", verticalAlign: "-2px" }}
                />
                Copiar links do {otherLabel}
              </button>
            </div>
          ) : null}

          <div className={styles.footerActions}>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled}
              onClick={() => void handleReset()}
            >
              <RotateCcw
                size={14}
                strokeWidth={1.75}
                aria-hidden
                style={{ marginRight: "0.35rem", verticalAlign: "-2px" }}
              />
              Restaurar menu padrão
            </button>
          </div>
        </div>

        <aside className={styles.previewAside}>
          <NavMenuPreview
            nav={nav}
            surfaceKey={surfaceKey}
            categories={categories}
            storeLabel={storeLabel}
          />
        </aside>
      </div>
    </div>
  );
}
