"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  AtSign,
  Clock,
  Eye,
  EyeOff,
  MapPin,
  Phone,
} from "lucide-react";
import { FieldHint } from "@/components/admin/FieldHint";
import { EnderecoLocalFields } from "@/components/admin/configuracoes/EnderecoLocalFields";
import { configTabHref } from "@/components/admin/configuracoes/configTabs";
import { getFooterContact } from "@/components/public/footerContact";
import { formatEnderecoLinha } from "@/src/lib/br/endereco";
import { instagramProfileUrl, syncInstagram } from "@/src/lib/instagram";
import { formatBrWhatsApp, normalizeWaDigits } from "@/src/lib/wa";
import type { SiteConfig } from "@/src/schemas/site-config";
import styles from "./ContatoPanel.module.css";

function InstagramGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function StatusBadge({
  tone,
  children,
}: {
  tone: "on" | "off" | "partial";
  children: ReactNode;
}) {
  const toneClass =
    tone === "on"
      ? styles.badgeOn
      : tone === "partial"
        ? styles.badgePartial
        : styles.badgeOff;
  const Icon = tone === "off" ? EyeOff : Eye;
  return (
    <span className={[styles.badge, toneClass].join(" ")}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {children}
    </span>
  );
}

function WhereChips({
  items,
}: {
  items: Array<{ label: string; active?: boolean; muted?: boolean }>;
}) {
  const visible = items.filter((item) => item.active);
  const list = visible.length > 0 ? visible : items;

  return (
    <div className={styles.whereChips}>
      <p className={styles.chipLabel}>Onde aparece</p>
      <ul className={styles.chips}>
        {list.map((item) => (
          <li
            key={item.label}
            className={[
              styles.chip,
              item.active ? styles.chipActive : "",
              item.muted ? styles.chipMuted : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PreviewSplit({
  summary,
  edit,
  renderPreview,
}: {
  summary: string;
  edit: ReactNode;
  renderPreview: (live: boolean) => ReactNode;
}) {
  return (
    <div className={styles.split}>
      <details className={styles.previewMobile}>
        <summary className={styles.previewMobileSummary}>{summary}</summary>
        <div className={styles.previewMobileBody}>{renderPreview(false)}</div>
      </details>
      <div className={styles.edit}>{edit}</div>
      <aside className={styles.previewAside}>{renderPreview(true)}</aside>
    </div>
  );
}

function InstagramPreview({
  config,
  live = true,
}: {
  config: SiteConfig;
  live?: boolean;
}) {
  const handle = config.instagram.handle.trim();
  const visible = Boolean(config.instagram.mostrar) && Boolean(handle);
  const url = handle ? instagramProfileUrl(handle) : "";

  return (
    <div
      className={styles.previewStack}
      {...(live ? { "aria-live": "polite" as const } : {})}
    >
      <p className={styles.previewLabel}>Prévia na vitrine</p>
      <div
        className={[
          styles.previewCard,
          visible ? "" : styles.previewCardMuted,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className={styles.previewCardTitle}>Botão Instagram</p>
        {visible ? (
          <>
            <span className={styles.previewIgButton}>
              <InstagramGlyph size={16} />
              Instagram
            </span>
            <p className={styles.previewIgHandle}>@{handle}</p>
            <p className={styles.previewNote}>
              Abre {url} na home, produto, Sobre, menu e rodapé.
            </p>
          </>
        ) : handle ? (
          <p className={styles.previewEmpty}>
            Perfil preenchido, mas o botão está oculto. Ative “Exibir botão na
            loja” para publicar.
          </p>
        ) : (
          <p className={styles.previewEmpty}>
            Informe o @ da loja e ative a exibição para o botão aparecer.
          </p>
        )}
      </div>
    </div>
  );
}

function EnderecoPreview({
  config,
  live = true,
}: {
  config: SiteConfig;
  live?: boolean;
}) {
  const line = formatEnderecoLinha(config.endereco).trim();
  const hours = config.horarios.trim();
  const footer = getFooterContact(config);
  const paginas = config.textos.paginas;
  const rodape = config.textos.rodape;

  return (
    <div
      className={styles.previewStack}
      {...(live ? { "aria-live": "polite" as const } : {})}
    >
      <p className={styles.previewLabel}>Prévia na vitrine</p>

      <div className={styles.previewCard}>
        <p className={styles.previewCardTitle}>Página Sobre</p>
        {line || hours ? (
          <>
            {line ? (
              <div className={styles.previewRow}>
                <span className={styles.previewRowLabel}>
                  {paginas.sobreLabelLocal}
                </span>
                <span className={styles.previewRowValue}>{line}</span>
              </div>
            ) : (
              <p className={styles.previewEmpty}>Endereço ainda vazio.</p>
            )}
            {hours ? (
              <div className={styles.previewRow}>
                <span className={styles.previewRowLabel}>
                  {paginas.sobreLabelHorarios}
                </span>
                <span className={styles.previewRowValue}>{hours}</span>
              </div>
            ) : (
              <p className={styles.previewEmpty}>Horário ainda vazio.</p>
            )}
            <p className={styles.previewNote}>
              Na página Sobre o endereço aparece sempre que estiver preenchido —
              independente do rodapé.
            </p>
          </>
        ) : (
          <p className={styles.previewEmpty}>
            Preencha endereço e horário para exibir na página Sobre.
          </p>
        )}
      </div>

      <div
        className={[
          styles.previewCard,
          footer.address || footer.hours ? "" : styles.previewCardMuted,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className={styles.previewCardTitle}>Rodapé</p>
        {footer.address || footer.hours ? (
          <>
            {footer.address ? (
              <div className={styles.previewRow}>
                <span className={styles.previewRowLabel}>
                  {rodape.labelEndereco}
                </span>
                <span className={styles.previewRowValue}>{footer.address}</span>
              </div>
            ) : line ? (
              <p className={styles.previewEmpty}>
                Endereço oculto no rodapé. Ative “Exibir endereço no rodapé”.
              </p>
            ) : null}
            {footer.hours ? (
              <div className={styles.previewRow}>
                <span className={styles.previewRowLabel}>
                  {rodape.labelHorarios}
                </span>
                <span className={styles.previewRowValue}>{footer.hours}</span>
              </div>
            ) : null}
          </>
        ) : (
          <p className={styles.previewEmpty}>
            Nada de endereço/horário no rodapé neste momento.
          </p>
        )}
        <p className={styles.previewNote}>
          A barra superior do site usa o mesmo endereço, mas o liga/desliga fica
          em{" "}
          <Link href={configTabHref("navegacao")}>Navegação</Link>.
        </p>
      </div>
    </div>
  );
}

function TelefonesPreview({
  config,
  live = true,
}: {
  config: SiteConfig;
  live?: boolean;
}) {
  const footer = getFooterContact(config);
  const rodape = config.textos.rodape;

  return (
    <div
      className={styles.previewStack}
      {...(live ? { "aria-live": "polite" as const } : {})}
    >
      <p className={styles.previewLabel}>Prévia no rodapé</p>
      <div
        className={[
          styles.previewCard,
          footer.phones.length > 0 ? "" : styles.previewCardMuted,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <p className={styles.previewCardTitle}>{rodape.tituloContato}</p>
        {footer.phones.length > 0 ? (
          <div className={styles.previewPhones}>
            <span className={styles.previewRowLabel}>{rodape.labelTelefone}</span>
            {footer.phones.map((phone) => (
              <div key={phone.id} className={styles.previewPhoneLine}>
                <Phone size={14} strokeWidth={2} aria-hidden />
                {phone.label}
                <span>{phone.id === "fixo" ? "Fixo" : "Celular"}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.previewEmpty}>
            Nenhum telefone visível. Preencha o número e ative “Exibir no
            rodapé”.
          </p>
        )}
      </div>
    </div>
  );
}

export function ContatoPanel({
  formId,
  config,
  disabled,
  onSubmit,
  onConfigChange,
}: {
  formId: string;
  config: SiteConfig;
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
}) {
  const igHandle = config.instagram.handle.trim();
  const igVisible = Boolean(config.instagram.mostrar) && Boolean(igHandle);
  const addressLine = formatEnderecoLinha(config.endereco).trim();
  const hours = config.horarios.trim();
  const footer = getFooterContact(config);
  const addressTone =
    addressLine && config.endereco.mostrar
      ? "on"
      : addressLine || hours
        ? "partial"
        : "off";
  const phonesVisible = footer.phones.length > 0;

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={[
        "admin-form",
        "admin-form--sections",
        disabled ? "admin-form--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={disabled || undefined}
    >
      <section className="admin-form__section">
        <header
          className={["admin-form__section-header", styles.sectionHeader].join(
            " ",
          )}
        >
          <div className={styles.sectionHeading}>
            <span
              className={[styles.sectionIcon, styles.sectionIconIg].join(" ")}
            >
              <InstagramGlyph size={18} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionMeta}>
                <h2 className="admin-form__section-title">Instagram</h2>
                <StatusBadge
                  tone={igVisible ? "on" : igHandle ? "partial" : "off"}
                >
                  {igVisible
                    ? "Visível na loja"
                    : igHandle
                      ? "Oculto"
                      : "Vazio"}
                </StatusBadge>
              </div>
              <p className="admin-form__section-desc">
                @ da loja vira botão para o perfil.
              </p>
            </div>
          </div>
        </header>
        <div className="admin-form__section-body">
          <PreviewSplit
            summary="Ver prévia"
            renderPreview={(live) => (
              <InstagramPreview config={config} live={live} />
            )}
            edit={
              <>
                <WhereChips
                  items={[
                    { label: "Home", active: igVisible },
                    { label: "Produto", active: igVisible },
                    { label: "Sobre", active: igVisible },
                    { label: "Menu", active: igVisible },
                    { label: "Rodapé", active: igVisible },
                  ]}
                />

                <div className={styles.visibilityCard}>
                  <div className={styles.visibilityCopy}>
                    <p className={styles.visibilityTitle}>
                      Exibir botão na loja
                    </p>
                    <p className={styles.visibilityDesc}>
                      Liga o Instagram nos botões e no rodapé.
                    </p>
                  </div>
                  <label
                    className="admin-switch"
                    data-disabled={disabled ? "true" : undefined}
                  >
                    <span className="visually-hidden">
                      Exibir botão Instagram na loja
                    </span>
                    <input
                      type="checkbox"
                      role="switch"
                      checked={Boolean(config.instagram.mostrar)}
                      disabled={disabled}
                      aria-label="Exibir botão Instagram na loja"
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          instagram: {
                            ...config.instagram,
                            mostrar: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="admin-switch__track" aria-hidden="true" />
                  </label>
                </div>

                <div className="admin-form__field">
                  <div className="admin-field-label">
                    <AtSign size={14} strokeWidth={2} aria-hidden />
                    Nome de usuário
                    <FieldHint text="Somente o @, sem link completo. Usamos isso para montar o endereço do perfil." />
                  </div>
                  <div className={styles.handlePrefix}>
                    <span aria-hidden>@</span>
                    <input
                      className="input"
                      placeholder="minhaloja"
                      disabled={disabled}
                      value={config.instagram.handle}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          instagram: syncInstagram({
                            ...config.instagram,
                            handle: e.target.value,
                          }),
                        })
                      }
                    />
                  </div>
                  {config.instagram.handle ? (
                    <p className={styles.fieldHelp}>
                      Link: {instagramProfileUrl(config.instagram.handle)}
                    </p>
                  ) : null}
                </div>
              </>
            }
          />
        </div>
      </section>

      <section className="admin-form__section">
        <header
          className={["admin-form__section-header", styles.sectionHeader].join(
            " ",
          )}
        >
          <div className={styles.sectionHeading}>
            <span
              className={[styles.sectionIcon, styles.sectionIconMap].join(" ")}
            >
              <MapPin size={18} strokeWidth={1.9} aria-hidden />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionMeta}>
                <h2 className="admin-form__section-title">
                  Endereço e horários
                </h2>
                <StatusBadge tone={addressTone}>
                  {addressTone === "on"
                    ? "No rodapé e na Sobre"
                    : addressTone === "partial"
                      ? "Parcialmente visível"
                      : "Vazio"}
                </StatusBadge>
              </div>
              <p className="admin-form__section-desc">
                Endereço e horários da loja física.
              </p>
            </div>
          </div>
        </header>
        <div className="admin-form__section-body">
          <PreviewSplit
            summary="Ver prévia"
            renderPreview={(live) => (
              <EnderecoPreview config={config} live={live} />
            )}
            edit={
              <>
                <WhereChips
                  items={[
                    {
                      label: "Página Sobre",
                      active: Boolean(addressLine || hours),
                    },
                    {
                      label: "Rodapé",
                      active: Boolean(footer.address || footer.hours),
                    },
                    {
                      label: "Barra superior",
                      muted: true,
                      active: false,
                    },
                  ]}
                />

                <EnderecoLocalFields
                  config={config}
                  disabled={disabled}
                  onConfigChange={onConfigChange}
                />

                <hr className={styles.divider} />

                <div className="admin-form__span">
                  <div className="admin-field-label">
                    <Clock size={14} strokeWidth={2} aria-hidden />
                    Horário de atendimento
                    <FieldHint text="Aparece na página Sobre e no rodapé. Deixe em branco para ocultar o horário." />
                  </div>
                  <textarea
                    className="textarea"
                    rows={2}
                    disabled={disabled}
                    placeholder="Seg–Sex 9h–18h · Sáb 9h–13h"
                    value={config.horarios}
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        horarios: e.target.value,
                      })
                    }
                  />
                </div>
              </>
            }
          />
        </div>
      </section>

      <section className="admin-form__section">
        <header
          className={["admin-form__section-header", styles.sectionHeader].join(
            " ",
          )}
        >
          <div className={styles.sectionHeading}>
            <span
              className={[styles.sectionIcon, styles.sectionIconPhone].join(
                " ",
              )}
            >
              <Phone size={18} strokeWidth={1.9} aria-hidden />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionMeta}>
                <h2 className="admin-form__section-title">Telefones</h2>
                <StatusBadge tone={phonesVisible ? "on" : "off"}>
                  {phonesVisible ? "Visível no rodapé" : "Oculto no rodapé"}
                </StatusBadge>
              </div>
              <p className="admin-form__section-desc">
                Fixo e celular no rodapé. Celular pode ser o do WhatsApp.
              </p>
            </div>
          </div>
        </header>
        <div className="admin-form__section-body">
          <PreviewSplit
            summary="Ver prévia"
            renderPreview={(live) => (
              <TelefonesPreview config={config} live={live} />
            )}
            edit={
              <>
                <WhereChips
                  items={[{ label: "Rodapé", active: phonesVisible }]}
                />

                <div className={styles.phoneCards}>
                  <div className={styles.phoneCard}>
                    <div className={styles.phoneCardHead}>
                      <div className="admin-field-label">
                        Telefone fixo
                        <FieldHint text="Número fixo exibido no rodapé, com link para ligar." />
                      </div>
                      <label
                        className="admin-switch"
                        data-disabled={disabled ? "true" : undefined}
                      >
                        <span>Exibir no rodapé</span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={Boolean(config.telefones.mostrarFixo)}
                          disabled={disabled}
                          aria-label="Exibir telefone fixo no rodapé"
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              telefones: {
                                ...config.telefones,
                                mostrarFixo: e.target.checked,
                              },
                            })
                          }
                        />
                        <span
                          className="admin-switch__track"
                          aria-hidden="true"
                        />
                      </label>
                    </div>
                    <input
                      className="input"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(16) 3333-3333"
                      disabled={disabled}
                      value={formatBrWhatsApp(config.telefones.fixo)}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          telefones: {
                            ...config.telefones,
                            fixo: normalizeWaDigits(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div className={styles.phoneCard}>
                    <div className={styles.phoneCardHead}>
                      <div className="admin-field-label">
                        Celular
                        <FieldHint text="Número de celular no rodapé. Pode usar o mesmo do WhatsApp." />
                      </div>
                      <div className={styles.phoneCardSwitches}>
                        <label
                          className="admin-switch"
                          data-disabled={disabled ? "true" : undefined}
                        >
                          <span>Exibir no rodapé</span>
                          <input
                            type="checkbox"
                            role="switch"
                            checked={Boolean(config.telefones.mostrarCelular)}
                            disabled={disabled}
                            aria-label="Exibir celular no rodapé"
                            onChange={(e) =>
                              onConfigChange({
                                ...config,
                                telefones: {
                                  ...config.telefones,
                                  mostrarCelular: e.target.checked,
                                },
                              })
                            }
                          />
                          <span
                            className="admin-switch__track"
                            aria-hidden="true"
                          />
                        </label>
                        <label
                          className="admin-switch"
                          data-disabled={disabled ? "true" : undefined}
                        >
                          <span>Usar WhatsApp</span>
                          <input
                            type="checkbox"
                            role="switch"
                            checked={Boolean(
                              config.telefones.usarWhatsappComoCelular,
                            )}
                            disabled={disabled}
                            aria-label="Usar o número do WhatsApp como celular no rodapé"
                            onChange={(e) =>
                              onConfigChange({
                                ...config,
                                telefones: {
                                  ...config.telefones,
                                  usarWhatsappComoCelular: e.target.checked,
                                },
                              })
                            }
                          />
                          <span
                            className="admin-switch__track"
                            aria-hidden="true"
                          />
                        </label>
                      </div>
                    </div>
                    {config.telefones.usarWhatsappComoCelular ? (
                      <p className={styles.fieldHelp}>
                        Usando o número da aba{" "}
                        <Link href={configTabHref("whatsapp")}>WhatsApp</Link>.
                      </p>
                    ) : null}
                    <input
                      className="input"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(16) 99999-9999"
                      disabled={
                        disabled ||
                        Boolean(config.telefones.usarWhatsappComoCelular)
                      }
                      value={formatBrWhatsApp(
                        config.telefones.usarWhatsappComoCelular
                          ? config.whatsapp.telefone
                          : config.telefones.celular,
                      )}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          telefones: {
                            ...config.telefones,
                            celular: normalizeWaDigits(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </>
            }
          />
        </div>
      </section>
    </form>
  );
}
