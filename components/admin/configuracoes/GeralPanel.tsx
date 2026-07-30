"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { FieldHint } from "@/components/admin/FieldHint";
import { ImageField, type ImageMeta } from "@/components/admin/ImageField";
import { ColorField } from "@/components/admin/configuracoes/ColorField";
import { ConfigGuide } from "@/components/admin/configuracoes/ConfigGuide";
import { ConfigPreviewSplit } from "@/components/admin/configuracoes/ConfigPreviewSplit";
import {
  expandHexIfComplete,
  normalizeHexForPicker,
} from "@/components/admin/configuracoes/siteTheme";
import { DashIcon, dashIcons } from "@/components/admin/dashboard/icons";
import {
  formatBrl,
  maskBrlInput,
  mediaUrl,
  parseBrlInput,
} from "@/src/lib/front/format";
import type { SiteConfig } from "@/src/schemas/site-config";
import styles from "./GeralPanel.module.css";

type ColorKey = keyof SiteConfig["cores"];

const COLOR_FIELDS: Array<{
  key: ColorKey;
  label: string;
  hint: string;
  where: string;
}> = [
  {
    key: "primaria",
    label: "Cor primária",
    hint: "Cor de destaque na vitrine (cabeçalho, botões) e acentos do painel admin.",
    where: "Botões e destaques",
  },
  {
    key: "secundaria",
    label: "Cor secundária",
    hint: "Textos fortes, contraste e fundos escuros da vitrine.",
    where: "Textos e cabeçalho",
  },
  {
    key: "fundo",
    label: "Fundo",
    hint: "Cor de fundo principal das páginas.",
    where: "Fundo da página",
  },
  {
    key: "fundoNeutro",
    label: "Fundo neutro",
    hint: "Fundos suaves de seções, cards e áreas secundárias.",
    where: "Cards e seções",
  },
  {
    key: "borda",
    label: "Borda",
    hint: "Linhas e contornos da interface.",
    where: "Contornos",
  },
];

const GERAL_GUIDE_STEPS = [
  {
    title: "Marca",
    body: "logo, nome e textos do cabeçalho, home e rodapé.",
  },
  {
    title: "Carrinho",
    body: "pedido na loja ou só pelo WhatsApp.",
  },
  {
    title: "Cores e meta",
    body: "paleta da vitrine e meta só do Painel.",
  },
];

function WhereBadge({ children }: { children: ReactNode }) {
  return <span className={styles.whereBadge}>{children}</span>;
}

function BrandPreview({
  config,
  logoDraft,
}: {
  config: SiteConfig;
  logoDraft: ImageMeta | null;
}) {
  const logoSrc = logoDraft?.previewUrl || mediaUrl(logoDraft?.path);
  const showName =
    !logoDraft || Boolean(config.mostrarNomeComLogo && config.nomeLoja.trim());
  const storeName = config.nomeLoja.trim() || "Nome da loja";
  const signature = config.assinatura.trim();
  const slogan = config.slogan.trim();

  return (
    <div className={styles.livePreview} aria-live="polite">
      <p className={styles.previewEyebrow}>Prévia · Vitrine</p>

      <div className={styles.brandStage}>
        <div className={styles.brandChrome}>
          <span className={styles.chromeDot} aria-hidden />
          <span className={styles.chromeDot} aria-hidden />
          <span className={styles.chromeDot} aria-hidden />
          <span className={styles.chromeUrl}>sua-loja.com</span>
        </div>

        <div className={styles.brandShell}>
          <header className={styles.brandHeader}>
            <div className={styles.brandIdentity}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoSrc}
                  alt=""
                  className={styles.brandLogo}
                />
              ) : (
                <span className={styles.brandLogoFallback} aria-hidden>
                  {(storeName[0] || "L").toUpperCase()}
                </span>
              )}
              {showName ? (
                <div className={styles.brandText}>
                  <strong className={styles.brandName}>{storeName}</strong>
                  {signature ? (
                    <span className={styles.brandSignature}>{signature}</span>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className={styles.brandNav} aria-hidden>
              <span>Catálogo</span>
              {config.mostrarCarrinho ? (
                <span className={styles.brandCart}>Carrinho</span>
              ) : null}
            </div>
          </header>

          <div className={styles.brandHero}>
            <p className={styles.brandHeroLabel}>Home · slogan</p>
            <p className={styles.brandSlogan}>
              {slogan ||
                "O slogan aparece aqui quando não houver banner na home."}
            </p>
          </div>

          <footer className={styles.brandFooter}>
            <div className={styles.brandFooterBrand}>
              {logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoSrc} alt="" className={styles.brandFooterLogo} />
              ) : null}
              <div>
                <strong>{storeName}</strong>
                {signature ? <span>{signature}</span> : null}
              </div>
            </div>
            <span className={styles.brandFooterMeta}>Rodapé</span>
          </footer>
        </div>
      </div>

      <ul className={styles.impactList}>
        <li>
          <WhereBadge>Cabeçalho</WhereBadge>
          Logo{showName ? ", nome" : ""}
          {signature && showName ? " e assinatura" : ""}
        </li>
        <li>
          <WhereBadge>Home</WhereBadge>
          Slogan (se não houver banner)
        </li>
        <li>
          <WhereBadge>Rodapé</WhereBadge>
          Nome e assinatura
        </li>
        <li>
          <WhereBadge>Aba do navegador</WhereBadge>
          Logo como ícone (favicon)
        </li>
      </ul>
    </div>
  );
}

function CartFlow({ on }: { on: boolean }) {
  const steps = on
    ? [
        { label: "Ícone no cabeçalho", tone: "on" as const },
        { label: "Adicionar ao carrinho", tone: "on" as const },
        { label: "Página /carrinho", tone: "on" as const },
        { label: "Pedido no WhatsApp", tone: "on" as const },
      ]
    : [
        { label: "Sem ícone no cabeçalho", tone: "off" as const },
        { label: "Só WhatsApp por produto", tone: "alt" as const },
        { label: "/carrinho oculto", tone: "off" as const },
        { label: "Pedido em lote inativo", tone: "off" as const },
      ];

  const compact = on
    ? "Cliente monta o pedido na loja e envia pelo WhatsApp."
    : "Sem carrinho: o cliente fala no WhatsApp em cada produto.";

  return (
    <>
      <p className={styles.cartFlowCompact}>{compact}</p>
      <ol className={styles.cartFlow} aria-label="O que muda com o carrinho">
        {steps.map((step, i) => (
          <li
            key={step.label}
            className={[
              styles.cartStep,
              step.tone === "on"
                ? styles.cartStepOn
                : step.tone === "alt"
                  ? styles.cartStepAlt
                  : styles.cartStepOff,
            ].join(" ")}
          >
            <span className={styles.cartStepNum} aria-hidden>
              {i + 1}
            </span>
            <span>{step.label}</span>
          </li>
        ))}
      </ol>
    </>
  );
}

function ColorsPreview({ cores }: { cores: SiteConfig["cores"] }) {
  const style = {
    "--gp-primary": cores.primaria,
    "--gp-secondary": cores.secundaria,
    "--gp-bg": cores.fundo,
    "--gp-muted": cores.fundoNeutro,
    "--gp-border": cores.borda,
  } as CSSProperties;

  return (
    <div className={styles.livePreview} aria-live="polite" style={style}>
      <p className={styles.previewEyebrow}>Prévia · Cores</p>
      <div className={styles.colorStage}>
        <div className={styles.colorShell}>
          <header className={styles.colorHeader}>
            <strong>Minha loja</strong>
            <span>Menu</span>
          </header>
          <div className={styles.colorBody}>
            <article className={styles.colorCard}>
              <div className={styles.colorThumb} />
              <p className={styles.colorTitle}>Produto em destaque</p>
              <p className={styles.colorText}>Texto e contornos da vitrine</p>
              <span className={styles.colorCta}>Comprar</span>
            </article>
          </div>
        </div>
      </div>
      <ul className={styles.colorLegend}>
        {COLOR_FIELDS.map((field) => (
          <li key={field.key}>
            <span
              className={styles.colorSwatch}
              style={{ background: cores[field.key] }}
              aria-hidden
            />
            <span>
              <strong>{field.label}</strong>
              <em>{field.where}</em>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MetaPreview({ mensal }: { mensal: number | null }) {
  if (mensal == null || mensal <= 0) {
    return (
      <div className={styles.livePreview} aria-live="polite">
        <p className={styles.previewEyebrow}>Prévia · Painel admin</p>
        <div className={styles.metaEmpty}>
          <DashIcon icon={dashIcons.meta} className={styles.metaEmptyIcon} />
          <p className={styles.metaEmptyTitle}>Meta oculta</p>
          <p className={styles.previewEmpty}>
            Sem valor, o bloco não aparece na aba Negócio.
          </p>
        </div>
      </div>
    );
  }

  const diasNoMes = 30;
  const diasExemplo = 15;
  const proporcional = (mensal * diasExemplo) / diasNoMes;
  const receitaExemplo = proporcional * 0.68;
  const pct = Math.min((receitaExemplo / proporcional) * 100, 100);

  return (
    <div className={styles.livePreview} aria-live="polite">
      <p className={styles.previewEyebrow}>Prévia · Painel admin</p>
      <div className={styles.previewCard}>
        <DashIcon icon={dashIcons.meta} className={styles.previewIcon} />
        <div className={styles.previewBody}>
          <p className={styles.previewTitle}>Meta (proporcional ao período)</p>
          <div
            className={styles.previewBar}
            role="img"
            aria-label={`Exemplo: ${pct.toFixed(0)}% da meta proporcional`}
          >
            <div
              className={styles.previewFill}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={styles.previewDetail}>
            <strong>{formatBrl(receitaExemplo)}</strong> de{" "}
            {formatBrl(proporcional)} ({pct.toFixed(0)}%) · meta mensal{" "}
            {formatBrl(mensal)}
          </p>
        </div>
      </div>
      <p className={styles.previewNote}>
        Só no Painel · Negócio. Exemplo ilustrativo (15 dias).
      </p>
    </div>
  );
}

function nomeLojaHint(logoDraft: ImageMeta | null, mostrarNome: boolean) {
  if (!logoDraft) {
    return "Cabeçalho, rodapé e títulos. Sem logo, o nome sempre aparece no cabeçalho.";
  }
  if (mostrarNome) {
    return "Cabeçalho (junto da logo), rodapé e títulos. Desligue o switch para ocultar no cabeçalho.";
  }
  return "Só no rodapé e títulos — a logo sozinha no cabeçalho. Ligue o switch para mostrar o nome junto.";
}

export function GeralPanel({
  formId,
  config,
  logoDraft,
  disabled,
  onSubmit,
  onConfigChange,
  onLogoChange,
}: {
  formId: string;
  config: SiteConfig;
  logoDraft: ImageMeta | null;
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
  onLogoChange: (next: ImageMeta | null) => void;
}) {
  const meta = config.metaReceitaMensal ?? null;
  const [metaDraft, setMetaDraft] = useState(
    meta != null ? formatBrl(meta) : "",
  );
  const cartOn = Boolean(config.mostrarCarrinho);

  useEffect(() => {
    setMetaDraft(meta != null ? formatBrl(meta) : "");
  }, [meta]);

  function setColor(key: ColorKey, hex: string) {
    const current = config.cores[key];
    if (current === hex) return;
    if (
      expandHexIfComplete(current) !== null &&
      normalizeHexForPicker(current) === normalizeHexForPicker(hex)
    ) {
      return;
    }
    onConfigChange({
      ...config,
      cores: { ...config.cores, [key]: hex },
    });
  }

  function commitMeta(raw: string) {
    const parsed = parseBrlInput(raw);
    onConfigChange({
      ...config,
      metaReceitaMensal: parsed,
    });
  }

  return (
    <div className={styles.shell}>
      <ConfigGuide
        guideId="geral"
        ariaLabel="Como configurar a identidade"
        steps={GERAL_GUIDE_STEPS}
      />

      <form
        id={formId}
        onSubmit={onSubmit}
        className={[
          "admin-form",
          "admin-form--sections",
          styles.form,
          disabled ? "admin-form--busy" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-busy={disabled || undefined}
      >
        <section className={`admin-form__section ${styles.section}`}>
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">Marca</h2>
            <p className="admin-form__section-desc">
              Logo, nome e textos do cabeçalho, home e rodapé.
            </p>
          </header>

          <div className="admin-form__section-body">
            <ConfigPreviewSplit
              preview={
                <BrandPreview config={config} logoDraft={logoDraft} />
              }
              edit={
                <div className={styles.editCol}>
                  <div className={styles.fieldBlock}>
                    <span className="admin-field-label">
                      Logo da loja
                      <FieldHint text="Cabeçalho, rodapé e ícone da aba do navegador." />
                    </span>
                    <ImageField
                      dominio="site"
                      value={logoDraft}
                      onChange={onLogoChange}
                      disabled={disabled}
                      label="Logo"
                      showAlt={false}
                      showRemove
                    />
                  </div>

                  <div className={styles.fieldBlock}>
                    <div className="admin-field-label">
                      Nome da loja
                      <FieldHint
                        text={nomeLojaHint(
                          logoDraft,
                          Boolean(config.mostrarNomeComLogo),
                        )}
                      />
                      <label
                        className="admin-switch"
                        data-disabled={
                          !logoDraft || disabled ? "true" : undefined
                        }
                        title={
                          logoDraft
                            ? "Mostrar o nome junto da logo no cabeçalho"
                            : "Disponível quando houver logo da loja"
                        }
                      >
                        <span>Mostrar no cabeçalho</span>
                        <input
                          type="checkbox"
                          role="switch"
                          checked={Boolean(
                            logoDraft && config.mostrarNomeComLogo,
                          )}
                          disabled={!logoDraft || disabled}
                          aria-label="Mostrar nome da loja no cabeçalho quando houver logo"
                          onChange={(e) =>
                            onConfigChange({
                              ...config,
                              mostrarNomeComLogo: e.target.checked,
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
                      value={config.nomeLoja}
                      disabled={disabled}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          nomeLoja: e.target.value,
                        })
                      }
                    />
                  </div>

                  <label className={styles.fieldBlock}>
                    <span className="admin-field-label">
                      Assinatura
                      <FieldHint text="Linha curta sob o nome no cabeçalho e no rodapé." />
                    </span>
                    <input
                      className="input"
                      value={config.assinatura}
                      disabled={disabled}
                      placeholder="Ex.: Catálogo online"
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          assinatura: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label className={styles.fieldBlock}>
                    <span className="admin-field-label">
                      Slogan
                      <FieldHint text="Boas-vindas na home (sem banner) e descrição usada pelo Google." />
                    </span>
                    <textarea
                      className="textarea"
                      rows={2}
                      value={config.slogan}
                      disabled={disabled}
                      onChange={(e) =>
                        onConfigChange({
                          ...config,
                          slogan: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              }
            />
          </div>
        </section>

        <section
          className={`admin-form__section ${styles.section} ${styles.cartSection}`}
        >
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">
              Carrinho na loja
              <FieldHint text="Liga o carrinho na vitrine e a mensagem de pedido pelo carrinho no WhatsApp. Afeta cabeçalho, página do produto e /carrinho." />
            </h2>
            <p className="admin-form__section-desc">
              Pedido na loja ou só pelo WhatsApp.
            </p>
          </header>

          <div className={`admin-form__section-body ${styles.cartBody}`}>
            <div
              className={[
                styles.cartDecision,
                cartOn ? styles.cartDecisionOn : styles.cartDecisionOff,
              ].join(" ")}
            >
              <div className={styles.cartDecisionHead}>
                <div>
                  <p className={styles.cartStatusLabel}>
                    {cartOn ? "Carrinho ligado" : "Carrinho desligado"}
                  </p>
                  <p className={styles.cartStatusDesc}>
                    {cartOn
                      ? "Cliente adiciona itens e envia o pedido pelo WhatsApp."
                      : "Cliente fala no WhatsApp em cada produto."}
                  </p>
                </div>
                <label
                  className={`admin-switch ${styles.cartSwitch}`}
                  data-disabled={disabled ? "true" : undefined}
                >
                  <span className={styles.srOnly}>Mostrar carrinho na loja</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={cartOn}
                    disabled={disabled}
                    aria-label="Mostrar carrinho na loja"
                    onChange={(e) =>
                      onConfigChange({
                        ...config,
                        mostrarCarrinho: e.target.checked,
                      })
                    }
                  />
                  <span className="admin-switch__track" aria-hidden="true" />
                </label>
              </div>

              <CartFlow on={cartOn} />
            </div>
          </div>
        </section>

        <section className={`admin-form__section ${styles.section}`}>
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">
              Cores
              <FieldHint text="Paleta da vitrine e acentos do painel. A prévia atualiza ao vivo." />
            </h2>
            <p className="admin-form__section-desc">
              Paleta da loja e acentos do painel.
            </p>
          </header>

          <div className="admin-form__section-body">
            <ConfigPreviewSplit
              preview={<ColorsPreview cores={config.cores} />}
              edit={
                <div className={styles.colorGrid}>
                  {COLOR_FIELDS.map((field) => (
                    <div key={field.key} className={styles.colorFieldWrap}>
                      <ColorField
                        label={field.label}
                        hint={field.hint}
                        value={config.cores[field.key]}
                        disabled={disabled}
                        onCommit={(hex) => setColor(field.key, hex)}
                      />
                    </div>
                  ))}
                </div>
              }
            />
          </div>
        </section>

        <section className={`admin-form__section ${styles.section}`}>
          <header className="admin-form__section-header">
            <h2 className="admin-form__section-title">
              Meta de receita
              <FieldHint text="Valor mensal na aba Negócio do Painel. Vazio = bloco oculto. Não aparece na loja." />
            </h2>
            <p className="admin-form__section-desc">
              Só no Painel · Negócio; não aparece na loja.
            </p>
          </header>

          <div className="admin-form__section-body">
            <ConfigPreviewSplit
              preview={<MetaPreview mensal={meta} />}
              edit={
                <div className={styles.editCol}>
                  <label className={`${styles.fieldBlock} ${styles.metaField}`}>
                    <span className="admin-field-label">Meta mensal (R$)</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      className="input"
                      placeholder="R$ 0,00"
                      value={metaDraft}
                      disabled={disabled}
                      onChange={(e) => {
                        const masked = maskBrlInput(e.target.value);
                        setMetaDraft(masked);
                        commitMeta(masked);
                      }}
                      onBlur={() => {
                        if (!metaDraft.trim()) {
                          commitMeta("");
                          return;
                        }
                        commitMeta(metaDraft);
                      }}
                    />
                  </label>
                </div>
              }
            />
          </div>
        </section>
      </form>
    </div>
  );
}
