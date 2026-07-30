"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { FieldHint } from "@/components/admin/FieldHint";
import { ColorField } from "@/components/admin/configuracoes/ColorField";
import {
  FONTE_CORPO_OPTIONS,
  FONTE_DISPLAY_OPTIONS,
  LARGURA_PRESETS,
  RAIO_SAMPLES,
  TIPOGRAFIA_PRESETS,
  containerPreviewWidth,
  fontFamilyCss,
  matchLarguraPreset,
  matchTipografiaPreset,
} from "@/components/admin/configuracoes/temaPresets";
import type { SiteConfig } from "@/src/schemas/site-config";
import {
  siteFonteIdSchema,
  type SiteFonteId,
} from "@/src/schemas/site-personalization";
import styles from "./TemaAvancadoPanel.module.css";

function TemaPreview({
  config,
  live,
}: {
  config: SiteConfig;
  live?: boolean;
}) {
  const { tema, cores, nomeLoja } = config;
  const previewWidth = containerPreviewWidth(tema.larguraContainer);
  const style = {
    "--preview-radius": `${tema.raio}px`,
    "--preview-width": previewWidth,
    "--preview-primary": cores.primaria,
    "--preview-secondary": cores.secundaria,
    "--preview-surface": cores.fundo,
    "--preview-muted": cores.fundoNeutro,
    "--preview-border": cores.borda,
    "--preview-whatsapp": tema.corWhatsapp,
    "--preview-instagram": tema.corInstagram,
    "--preview-font": fontFamilyCss(tema.fonteCorpo, "corpo"),
    "--preview-font-display": fontFamilyCss(tema.fonteDisplay, "display"),
  } as CSSProperties;

  return (
    <div
      className={[styles.previewCard, live ? styles.previewCardLive : ""]
        .filter(Boolean)
        .join(" ")}
      style={style}
      aria-hidden={!live ? true : undefined}
    >
      <p className={styles.previewLabel}>Exemplo da vitrine</p>
      <div className={styles.previewStage}>
        <div className={styles.previewShell}>
          <header className={styles.previewHeader}>
            <strong className={styles.previewBrand}>
              {nomeLoja || "Minha loja"}
            </strong>
            <span className={styles.previewNav}>Catálogo</span>
          </header>
          <div className={styles.previewBody}>
            <article className={styles.previewProduct}>
              <div className={styles.previewThumb} />
              <h3 className={styles.previewTitle}>Peça em destaque</h3>
              <p className={styles.previewText}>
                Texto do produto com a fonte do corpo selecionada.
              </p>
              <button type="button" className={styles.previewCta} tabIndex={-1}>
                Ver detalhes
              </button>
            </article>
            <div className={styles.previewSocial}>
              <span
                className={styles.previewSocialDot}
                style={{ background: "var(--preview-whatsapp)" }}
                title="WhatsApp"
              />
              <span
                className={styles.previewSocialDot}
                style={{ background: "var(--preview-instagram)" }}
                title="Instagram"
              />
            </div>
          </div>
        </div>
      </div>
      <p className={styles.previewNote}>
        Cantos {tema.raio}px · largura {tema.larguraContainer}
      </p>
    </div>
  );
}

export function TemaAvancadoPanel({
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
  const tema = config.tema;
  const larguraPreset = matchLarguraPreset(tema.larguraContainer);
  const tipografiaPreset = matchTipografiaPreset(tema);
  const [customFontsMode, setCustomFontsMode] = useState(
    tipografiaPreset === "personalizada",
  );

  useEffect(() => {
    if (tipografiaPreset === "personalizada") setCustomFontsMode(true);
  }, [tipografiaPreset]);

  const showCustomFonts =
    customFontsMode || tipografiaPreset === "personalizada";

  function patchTema(partial: Partial<typeof tema>) {
    onConfigChange({
      ...config,
      tema: { ...tema, ...partial },
    });
  }

  function setFonte(role: "fonteCorpo" | "fonteDisplay", raw: string) {
    const v = siteFonteIdSchema.parse(raw) as SiteFonteId;
    setCustomFontsMode(true);
    patchTema({ [role]: v });
  }

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
        <header className="admin-form__section-header">
          <h2 className="admin-form__section-title">Tema da vitrine</h2>
          <p className="admin-form__section-desc">
            Cantos, largura, fontes e cores dos ícones sociais.
          </p>
        </header>

        <div className={`admin-form__section-body ${styles.sectionBody}`}>
          <details className={styles.previewMobile}>
            <summary className={styles.previewMobileSummary}>Ver prévia</summary>
            <div className={styles.previewMobileBody}>
              <TemaPreview config={config} />
            </div>
          </details>

          <div className={styles.edit}>
            <div className={styles.controlBlock}>
              <div className={styles.controlHeader}>
                <span className="admin-field-label">
                  Cantos arredondados
                  <FieldHint text="Define o arredondamento de cards, botões e campos na loja. 0 = cantos retos; valores maiores = visual mais suave." />
                </span>
                <span className={styles.controlValue}>{tema.raio} px</span>
              </div>

              <div
                className={styles.raioSamples}
                role="radiogroup"
                aria-label="Amostras de raio"
              >
                {RAIO_SAMPLES.map((sample) => {
                  const active = tema.raio === sample;
                  return (
                    <button
                      key={sample}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`${styles.raioSample}${active ? ` ${styles.raioSampleActive}` : ""}`}
                      disabled={disabled}
                      onClick={() => patchTema({ raio: sample })}
                    >
                      <span
                        className={styles.raioSampleShape}
                        style={{ borderRadius: `${sample}px` }}
                      />
                      <span>{sample}</span>
                    </button>
                  );
                })}
              </div>

              <label className={styles.sliderRow}>
                <span className={styles.visuallyHidden}>Raio em pixels</span>
                <input
                  type="range"
                  min={0}
                  max={32}
                  step={1}
                  disabled={disabled}
                  value={tema.raio}
                  aria-label="Ajustar raio"
                  onChange={(e) =>
                    patchTema({ raio: Number(e.target.value) || 0 })
                  }
                />
                <input
                  className="input admin-config-input--xs"
                  type="number"
                  min={0}
                  max={32}
                  disabled={disabled}
                  value={tema.raio}
                  aria-label="Raio em pixels"
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    patchTema({
                      raio: Number.isFinite(n)
                        ? Math.min(32, Math.max(0, Math.round(n)))
                        : 0,
                    });
                  }}
                />
              </label>
            </div>

            <div className={styles.controlBlock}>
              <div className={styles.controlHeader}>
                <span className="admin-field-label">
                  Largura do conteúdo
                  <FieldHint text="Limite máximo da área central da loja (não da tela inteira). Em celulares a largura se adapta automaticamente." />
                </span>
              </div>
              <div
                className={styles.presetGrid}
                role="radiogroup"
                aria-label="Largura do conteúdo"
              >
                {LARGURA_PRESETS.map((preset) => {
                  const active = larguraPreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`admin-layout-card${active ? " admin-layout-card--active" : ""}`}
                      disabled={disabled}
                      onClick={() =>
                        patchTema({ larguraContainer: preset.value })
                      }
                    >
                      <div className={styles.widthPreview}>
                        <span
                          className={styles.widthPreviewBar}
                          style={{
                            width:
                              preset.id === "compacta"
                                ? "62%"
                                : preset.id === "padrao"
                                  ? "78%"
                                  : "92%",
                          }}
                        />
                      </div>
                      <div className="admin-layout-card__meta">
                        <strong>{preset.label}</strong>
                        <span>{preset.descricao}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              {larguraPreset === "personalizada" ? (
                <p className="admin-alert admin-alert--warn" role="status">
                  Largura personalizada em uso ({tema.larguraContainer}). Ajuste
                  nas opções avançadas abaixo.
                </p>
              ) : null}
            </div>
          </div>

          <aside className={styles.previewAside}>
            <TemaPreview config={config} live />
          </aside>
        </div>
      </section>

      <section className="admin-form__section">
        <header className="admin-form__section-header">
          <h2 className="admin-form__section-title">Tipografia</h2>
          <p className="admin-form__section-desc">
            Estilo pronto ou fontes manuais para títulos e textos.
          </p>
        </header>
        <div className="admin-form__section-body">
          <div
            className={styles.presetGrid}
            role="radiogroup"
            aria-label="Estilo tipográfico"
          >
            {TIPOGRAFIA_PRESETS.map((preset) => {
              const active =
                !showCustomFonts && tipografiaPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`admin-layout-card${active ? " admin-layout-card--active" : ""}`}
                  disabled={disabled}
                  onClick={() => {
                    setCustomFontsMode(false);
                    patchTema({
                      fonteCorpo: preset.fonteCorpo,
                      fonteDisplay: preset.fonteDisplay,
                    });
                  }}
                >
                  <div
                    className={styles.fontSample}
                    style={
                      {
                        "--sample-display": fontFamilyCss(
                          preset.fonteDisplay,
                          "display",
                        ),
                        "--sample-body": fontFamilyCss(
                          preset.fonteCorpo,
                          "corpo",
                        ),
                      } as CSSProperties
                    }
                  >
                    <strong>Título</strong>
                    <span>Texto do corpo Aa</span>
                  </div>
                  <div className="admin-layout-card__meta">
                    <strong>{preset.label}</strong>
                    <span>{preset.descricao}</span>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={showCustomFonts}
              className={`admin-layout-card${showCustomFonts ? " admin-layout-card--active" : ""}`}
              disabled={disabled}
              onClick={() => setCustomFontsMode(true)}
            >
              <div className={styles.fontSampleCustom}>
                <strong>Aa / Bb</strong>
                <span>Combine à vontade</span>
              </div>
              <div className="admin-layout-card__meta">
                <strong>Personalizada</strong>
                <span>Escolha fonte de título e de texto separadamente.</span>
              </div>
            </button>
          </div>

          {showCustomFonts ? (
            <div className={styles.customFonts}>
              <label className="admin-form__field">
                <span className="admin-field-label">
                  Fonte dos títulos
                  <FieldHint text="Usada em títulos de página, nomes de produto e destaques." />
                </span>
                <select
                  className="input"
                  disabled={disabled}
                  value={tema.fonteDisplay}
                  onChange={(e) => setFonte("fonteDisplay", e.target.value)}
                >
                  {FONTE_DISPLAY_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-form__field">
                <span className="admin-field-label">
                  Fonte dos textos
                  <FieldHint text="Usada em descrições, menus, formulários e textos gerais." />
                </span>
                <select
                  className="input"
                  disabled={disabled}
                  value={tema.fonteCorpo}
                  onChange={(e) => setFonte("fonteCorpo", e.target.value)}
                >
                  {FONTE_CORPO_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
      </section>

      <section className="admin-form__section">
        <header className="admin-form__section-header">
          <h2 className="admin-form__section-title">Cores das redes</h2>
          <p className="admin-form__section-desc">
            Cor dos ícones de WhatsApp e Instagram na loja.
          </p>
        </header>
        <div className="admin-form__section-body admin-config-colors">
          <ColorField
            label="WhatsApp"
            hint="Cor dos botões e ícones de WhatsApp na loja."
            value={tema.corWhatsapp}
            disabled={disabled}
            onCommit={(hex) => patchTema({ corWhatsapp: hex })}
          />
          <ColorField
            label="Instagram"
            hint="Cor do ícone do Instagram no rodapé e contatos."
            value={tema.corInstagram}
            disabled={disabled}
            onCommit={(hex) => patchTema({ corInstagram: hex })}
          />
        </div>
      </section>

      <section className="admin-form__section admin-form__section--compact">
        <details className={styles.advanced}>
          <summary className={styles.advancedSummary}>
            <span>Opções avançadas</span>
            <span className={styles.advancedHint}>
              Largura personalizada e SEO
            </span>
          </summary>
          <div className={styles.advancedBody}>
            <label className="admin-form__field">
              <span className="admin-field-label">
                Largura máxima personalizada
                <FieldHint text="Exemplos: 1120px, 90%, 70rem. Em telas menores o conteúdo continua se adaptando." />
              </span>
              <input
                className="input"
                disabled={disabled}
                value={tema.larguraContainer}
                spellCheck={false}
                placeholder="1120px"
                onChange={(e) =>
                  patchTema({ larguraContainer: e.target.value })
                }
              />
            </label>

            <label className="admin-form__field">
              <span className="admin-field-label">
                Modelo do título da aba
                <FieldHint text="Como o nome da página aparece na aba do navegador. Use %s para o título da página e {nomeLoja} para o nome da loja. Ex.: %s · {nomeLoja}" />
              </span>
              <input
                className="input"
                disabled={disabled}
                value={config.seo.titleTemplate}
                placeholder="%s · {nomeLoja}"
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    seo: { ...config.seo, titleTemplate: e.target.value },
                  })
                }
              />
              <span className={styles.fieldExample}>
                Exemplo: Produto X · {config.nomeLoja || "Minha loja"}
              </span>
            </label>

            <label className="admin-form__field">
              <span className="admin-field-label">
                Idioma do site
                <FieldHint text="Código de idioma informado aos buscadores e leitores de tela. Padrão no Brasil: pt-BR." />
              </span>
              <input
                className="input"
                disabled={disabled}
                value={config.seo.idioma}
                placeholder="pt-BR"
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    seo: { ...config.seo, idioma: e.target.value },
                  })
                }
              />
            </label>
          </div>
        </details>
      </section>
    </form>
  );
}
