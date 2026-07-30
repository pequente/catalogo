"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import {
  Eye,
  EyeOff,
  Home,
  Info,
  Menu,
  MessageCircle,
  Package,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { MensagemProdutoEditor } from "@/components/admin/configuracoes/MensagemProdutoEditor";
import { MensagemCarrinhoEditor } from "@/components/admin/configuracoes/MensagemCarrinhoEditor";
import { WhatsAppSectionSplit } from "@/components/admin/configuracoes/WhatsAppSectionSplit";
import {
  WhatsAppStorePreview,
  type StorePreviewSurface,
} from "@/components/admin/configuracoes/WhatsAppStorePreview";
import styles from "@/components/admin/configuracoes/WhatsAppPanel.module.css";
import { formatBrWhatsApp, normalizeWaDigits } from "@/src/lib/wa";
import type { SiteConfig } from "@/src/schemas/site-config";

function StatusBadge({
  tone,
  children,
}: {
  tone: "on" | "off" | "partial" | "warn";
  children: ReactNode;
}) {
  const toneClass =
    tone === "on"
      ? styles.badgeOn
      : tone === "partial"
        ? styles.badgePartial
        : tone === "warn"
          ? styles.badgeWarn
          : styles.badgeOff;
  const Icon = tone === "off" ? EyeOff : Eye;
  return (
    <span className={[styles.badge, toneClass].join(" ")}>
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {children}
    </span>
  );
}

type SurfaceId = StorePreviewSurface | "menu" | "rodape" | "sobre";

type SurfaceDef = {
  id: SurfaceId;
  title: string;
  desc: string;
  Icon: typeof Home;
  preview?: StorePreviewSurface;
  active: boolean;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function WhatsAppPanel({
  formId,
  config,
  disabled,
  onSubmit,
  onConfigChange,
  onOpenGeralTab,
  onOpenNavegacaoTab,
  navegacaoLoaded,
}: {
  formId: string;
  config: SiteConfig;
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
  onOpenGeralTab?: () => void;
  onOpenNavegacaoTab?: () => void;
  /** True when the navegacao tab slice has been merged into config. */
  navegacaoLoaded?: boolean;
}) {
  const cartEnabled = Boolean(config.mostrarCarrinho);
  const waEnabled = Boolean(config.whatsapp.mostrar);
  const leadEnabled = Boolean(config.comportamento.whatsappColetarLead);
  const phoneDisplay = formatBrWhatsApp(config.whatsapp.telefone);
  const hasPhone = Boolean(config.whatsapp.telefone.trim());
  const storeName = config.nomeLoja?.trim() || "Sua loja";

  const drawerWhatsapp =
    config.navegacao?.drawer?.extras?.mostrarWhatsapp !== false;
  const menuActive = waEnabled && drawerWhatsapp;

  const [previewSurface, setPreviewSurface] =
    useState<StorePreviewSurface>("home");

  const mensagemPadraoPreview =
    config.whatsapp.mensagemPadrao.trim() ||
    "Olá! Vim pelo site e gostaria de mais informações.";

  const leadPreview = leadEnabled
    ? `Olá, sou Maria!!!\n${mensagemPadraoPreview}`
    : mensagemPadraoPreview;

  const surfaces: SurfaceDef[] = [
    {
      id: "home",
      title: "Home",
      desc: "Botão no destaque e na faixa de dúvidas.",
      Icon: Home,
      preview: "home",
      active: waEnabled,
    },
    {
      id: "menu",
      title: "Menu do celular",
      desc: "Atalho no menu lateral.",
      Icon: Menu,
      active: menuActive,
      hint: !waEnabled
        ? "Desligado junto com o WhatsApp da loja."
        : navegacaoLoaded && !drawerWhatsapp
          ? "Desligado na aba Navegação."
          : undefined,
      actionLabel:
        navegacaoLoaded && !drawerWhatsapp ? "Abrir Navegação" : undefined,
      onAction: onOpenNavegacaoTab,
    },
    {
      id: "rodape",
      title: "Rodapé",
      desc: "Ícone social no rodapé.",
      Icon: MessageCircle,
      preview: "home",
      active: waEnabled,
    },
    {
      id: "sobre",
      title: "Página Sobre",
      desc: "Botão junto aos contatos.",
      Icon: Info,
      active: waEnabled,
    },
    {
      id: "produto",
      title: "Página do produto",
      desc: "“Tenho interesse” com o item.",
      Icon: Package,
      preview: "produto",
      active: waEnabled,
    },
    {
      id: "carrinho",
      title: "Carrinho",
      desc: "Pedido com vários produtos.",
      Icon: ShoppingBag,
      preview: "carrinho",
      active: waEnabled && cartEnabled,
      hint: !cartEnabled
        ? "Carrinho desligado na aba Geral."
        : undefined,
      actionLabel: !cartEnabled ? "Ativar na aba Geral" : undefined,
      onAction: onOpenGeralTab,
    },
  ];

  return (
    <form
      id={formId}
      onSubmit={onSubmit}
      className={[
        "admin-form",
        "admin-form--sections",
        styles.waAccent,
        disabled ? "admin-form--busy" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-busy={disabled || undefined}
    >
      {/* ── 1. Canal ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden>
              <MessageCircle size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  1
                </span>
                <h2 className="admin-form__section-title">Seu número</h2>
              </div>
              <p className="admin-form__section-desc">
                Celular que recebe as conversas. Desligado, some da loja.
              </p>
            </div>
          </div>
          <div className={styles.sectionMeta}>
            <StatusBadge tone={waEnabled && hasPhone ? "on" : waEnabled ? "warn" : "off"}>
              {waEnabled && hasPhone
                ? "Visível na loja"
                : waEnabled
                  ? "Falta o número"
                  : "Oculto na loja"}
            </StatusBadge>
          </div>
        </header>

        <div className="admin-form__section-body">
          <div
            className={[
              styles.channelBar,
              !waEnabled ? styles.channelBarOff : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className={styles.channelBarInfo}>
              <p className={styles.channelBarLabel}>Número configurado</p>
              <p
                className={[
                  styles.channelBarPhone,
                  !hasPhone ? styles.channelBarPhoneEmpty : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {hasPhone ? phoneDisplay : "Ainda sem número"}
              </p>
            </div>
            <label
              className="admin-switch"
              data-disabled={disabled ? "true" : undefined}
            >
              <span>Mostrar botão na loja</span>
              <input
                type="checkbox"
                role="switch"
                checked={waEnabled}
                disabled={disabled}
                aria-label="Mostrar botão WhatsApp na loja"
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    whatsapp: {
                      ...config.whatsapp,
                      mostrar: e.target.checked,
                    },
                  })
                }
              />
              <span className="admin-switch__track" aria-hidden="true" />
            </label>
          </div>

          <label className="admin-form__field">
            <span className="wa-settings__field-title">
              Seu número (DDD + celular)
            </span>
            <input
              className="input"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(16) 99999-9999"
              disabled={disabled}
              value={phoneDisplay}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  whatsapp: {
                    ...config.whatsapp,
                    telefone: normalizeWaDigits(e.target.value),
                  },
                })
              }
            />
          </label>
        </div>
      </section>

      {/* ── 2. Onde aparece ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden>
              <Eye size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  2
                </span>
                <h2 className="admin-form__section-title">
                  Onde o cliente encontra
                </h2>
              </div>
              <p className="admin-form__section-desc">
                Toque num card para ver a miniatura. Apagados = desligados.
              </p>
            </div>
          </div>
        </header>

        <div className="admin-form__section-body">
          <div className={styles.surfaces}>
            {surfaces.map((s) => {
              const Icon = s.Icon;
              const selected =
                s.preview !== undefined && previewSurface === s.preview;
              const clickable = s.preview !== undefined;

              const className = [
                styles.surfaceCard,
                clickable ? styles.surfaceCardButton : "",
                selected ? styles.surfaceCardActive : "",
                !s.active ? styles.surfaceCardOff : "",
              ]
                .filter(Boolean)
                .join(" ");

              const body = (
                <>
                  <div className={styles.surfaceTop}>
                    <span
                      className={[
                        styles.surfaceIcon,
                        !s.active ? styles.surfaceIconOff : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden
                    >
                      <Icon size={16} strokeWidth={2.25} />
                    </span>
                    <StatusBadge tone={s.active ? "on" : "off"}>
                      {s.active ? "Aparece" : "Não aparece"}
                    </StatusBadge>
                  </div>
                  <p className={styles.surfaceTitle}>{s.title}</p>
                  <p className={styles.surfaceDesc}>{s.desc}</p>
                  {s.hint ? (
                    <p className={styles.surfaceHint}>{s.hint}</p>
                  ) : null}
                  {s.actionLabel && s.onAction ? (
                    <button
                      type="button"
                      className={styles.surfaceLink}
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        s.onAction?.();
                      }}
                    >
                      {s.actionLabel}
                    </button>
                  ) : null}
                </>
              );

              if (clickable) {
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={className}
                    disabled={disabled}
                    aria-pressed={selected}
                    onClick={() => setPreviewSurface(s.preview!)}
                  >
                    {body}
                  </button>
                );
              }

              return (
                <div key={s.id} className={className}>
                  {body}
                </div>
              );
            })}
          </div>

          <WhatsAppStorePreview
            storeName={storeName}
            whatsappEnabled={waEnabled}
            cartEnabled={cartEnabled}
            surface={previewSurface}
            onSurfaceChange={setPreviewSurface}
          />
        </div>
      </section>

      {/* ── 3. Antes de abrir ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden>
              <UserRound size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  3
                </span>
                <h2 className="admin-form__section-title">
                  Antes de abrir o WhatsApp
                </h2>
              </div>
              <p className="admin-form__section-desc">
                Opcional: pedir nome e contato antes de abrir o app.
              </p>
            </div>
          </div>
          <div className={styles.sectionMeta}>
            <StatusBadge tone={leadEnabled ? "on" : "off"}>
              {leadEnabled ? "Pede contato" : "Abre direto"}
            </StatusBadge>
          </div>
        </header>

        <div className="admin-form__section-body">
          <div className={styles.leadCard}>
            <label
              className="admin-switch admin-switch--block"
              data-disabled={disabled ? "true" : undefined}
            >
              <span>Pedir nome e contato antes de abrir</span>
              <input
                type="checkbox"
                role="switch"
                checked={leadEnabled}
                disabled={disabled}
                aria-label="Coletar lead antes do WhatsApp"
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    comportamento: {
                      ...config.comportamento,
                      whatsappColetarLead: e.target.checked,
                    },
                  })
                }
              />
              <span className="admin-switch__track" aria-hidden="true" />
            </label>

            {leadEnabled ? (
              <div className={styles.leadFlow} aria-hidden={false}>
                <div className={styles.leadStep}>
                  <span className={styles.leadStepNum}>1</span>
                  <div className={styles.leadStepBody}>
                    <p className={styles.leadStepTitle}>Clica no botão</p>
                    <p className={styles.leadStepDesc}>
                      Em qualquer lugar da loja.
                    </p>
                  </div>
                </div>
                <div className={styles.leadStep}>
                  <span className={styles.leadStepNum}>2</span>
                  <div className={styles.leadStepBody}>
                    <p className={styles.leadStepTitle}>Preenche o formulário</p>
                    <p className={styles.leadStepDesc}>
                      Nome + e-mail ou celular.
                    </p>
                  </div>
                </div>
                <div className={styles.leadStep}>
                  <span className={styles.leadStepNum}>3</span>
                  <div className={styles.leadStepBody}>
                    <p className={styles.leadStepTitle}>Abre o WhatsApp</p>
                    <p className={styles.leadStepDesc}>
                      Com “Olá, sou Nome!!!” na mensagem.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* ── 4. Mensagem geral ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden>
              <MessageCircle size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  4
                </span>
                <h2 className="admin-form__section-title">Mensagem geral</h2>
              </div>
              <p className="admin-form__section-desc">
                Texto ao clicar no WhatsApp sem produto específico.
              </p>
            </div>
          </div>
        </header>

        <div className="admin-form__section-body">
          <WhatsAppSectionSplit
            previewLabel="Assim abre no aplicativo"
            previewText={leadPreview}
            previewNote={
              leadEnabled
                ? "A saudação com o nome só aparece depois que o cliente se identifica."
                : undefined
            }
            storeName={storeName}
            phoneLabel={hasPhone ? phoneDisplay : undefined}
            mobileSummary="Ver prévia"
            asideExtra={
              <WhatsAppStorePreview
                storeName={storeName}
                whatsappEnabled={waEnabled}
                cartEnabled={cartEnabled}
                surface="home"
              />
            }
          >
            <div className={styles.waFieldsStack}>
              <label className="admin-form__field">
                <span className="wa-settings__field-title">
                  Quando clicam no WhatsApp do site
                </span>
                <textarea
                  className="textarea"
                  rows={3}
                  disabled={disabled}
                  value={config.whatsapp.mensagemPadrao}
                  onChange={(e) =>
                    onConfigChange({
                      ...config,
                      whatsapp: {
                        ...config.whatsapp,
                        mensagemPadrao: e.target.value,
                      },
                    })
                  }
                />
              </label>
            </div>
          </WhatsAppSectionSplit>
        </div>
      </section>

      {/* ── 5. Produto ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionIcon} aria-hidden>
              <Package size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  5
                </span>
                <h2 className="admin-form__section-title">
                  Interesse em um produto
                </h2>
              </div>
              <p className="admin-form__section-desc">
                Nome, tamanho, cor e link entram sozinhos — você define o formato.
              </p>
            </div>
          </div>
        </header>
        <div className="admin-form__section-body">
          <MensagemProdutoEditor
            config={config}
            disabled={disabled}
            onConfigChange={onConfigChange}
            storeName={storeName}
            phoneLabel={hasPhone ? phoneDisplay : undefined}
            whatsappEnabled={waEnabled}
            cartEnabled={cartEnabled}
          />
        </div>
      </section>

      {/* ── 6. Carrinho ── */}
      <section className="admin-form__section">
        <header className={["admin-form__section-header", styles.sectionHeader].join(" ")}>
          <div className={styles.sectionHeading}>
            <span
              className={[
                styles.sectionIcon,
                !cartEnabled ? styles.sectionIconMuted : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden
            >
              <ShoppingBag size={18} strokeWidth={2.25} />
            </span>
            <div className={styles.sectionTitles}>
              <div className={styles.sectionTitleRow}>
                <span className={styles.stepBadge} aria-hidden>
                  6
                </span>
                <h2 className="admin-form__section-title">
                  Pedido pelo carrinho
                </h2>
              </div>
              <p className="admin-form__section-desc">
                Vários produtos em um único WhatsApp pelo carrinho.
              </p>
            </div>
          </div>
          <div className={styles.sectionMeta}>
            <StatusBadge tone={cartEnabled ? "on" : "off"}>
              {cartEnabled ? "Carrinho ativo" : "Carrinho desligado"}
            </StatusBadge>
          </div>
        </header>
        <div
          className={[
            "admin-form__section-body",
            !cartEnabled ? "admin-form__section-body--cart-disabled" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {!cartEnabled ? (
            <div className={styles.notice} role="status">
              <p>
                O carrinho está desabilitado na loja. Os clientes não veem
                carrinho nem enviam pedido por essa mensagem.
              </p>
              {onOpenGeralTab ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={onOpenGeralTab}
                >
                  Ativar na aba Geral
                </button>
              ) : null}
            </div>
          ) : null}
          <MensagemCarrinhoEditor
            config={config}
            disabled={disabled || !cartEnabled}
            previewMuted={!cartEnabled}
            onConfigChange={onConfigChange}
            storeName={storeName}
            phoneLabel={hasPhone ? phoneDisplay : undefined}
            whatsappEnabled={waEnabled}
            cartEnabled={cartEnabled}
          />
        </div>
      </section>
    </form>
  );
}
