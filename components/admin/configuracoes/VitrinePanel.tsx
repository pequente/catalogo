"use client";

import { useState } from "react";
import { BannersClient } from "@/components/admin/BannersClient";
import { FieldHint } from "@/components/admin/FieldHint";
import { ConfigGuide } from "@/components/admin/configuracoes/ConfigGuide";
import { LayoutPreview } from "@/components/admin/configuracoes/siteTheme";
import { VitrinePreview } from "@/components/admin/configuracoes/VitrinePreview";
import { SITE_LAYOUT_OPTIONS } from "@/components/public/layouts/options";
import type { Banner } from "@/src/schemas/banner";
import type { SiteConfig, SiteLayoutId } from "@/src/schemas/site-config";
import styles from "./VitrinePanel.module.css";

const VITRINE_GUIDE_STEPS = [
  {
    title: "Escolha o modelo",
    body: "da página inicial. A prévia mostra onde cada área aparece.",
  },
  {
    title: "Configure as áreas",
    body: "numeradas — envie fotos e, se quiser, link e texto do botão.",
  },
  {
    title: "Salve o layout",
    body: "no botão Salvar. Imagens gravadas ao escolher o arquivo.",
  },
];

export function VitrinePanel({
  formId,
  config,
  baselineLayout,
  primaryColor,
  initialBanners,
  disabled,
  onSubmit,
  onConfigChange,
}: {
  formId: string;
  config: SiteConfig;
  baselineLayout: SiteLayoutId;
  primaryColor: string;
  initialBanners: Banner[];
  disabled?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onConfigChange: (next: SiteConfig) => void;
}) {
  const selectedLayout = config.layout ?? "classic";
  const layoutDraft = selectedLayout !== baselineLayout;
  const [banners, setBanners] = useState<Banner[]>(initialBanners);

  const preview = (
    <VitrinePreview
      layout={selectedLayout}
      banners={banners}
      storeName={config.nomeLoja}
      primaryColor={primaryColor}
      live
    />
  );

  return (
    <div className="admin-config-vitrine">
      <ConfigGuide
        guideId="vitrine"
        ariaLabel="Como configurar a vitrine"
        steps={VITRINE_GUIDE_STEPS}
      />

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
            <h2 className="admin-form__section-title">
              Modelo da página inicial
              <FieldHint text="Define topo, meio e final da home; cabeçalho e rodapé acompanham. Áreas de imagem mudam com o modelo. Imagens salvam ao enviar; o modelo só publica com Salvar." />
            </h2>
            <p className="admin-form__section-desc">
              Escolha o modelo da home e salve para publicar.
            </p>
          </header>

          <div className={`admin-form__section-body ${styles.sectionBody}`}>
            <details className={styles.previewMobile}>
              <summary className={styles.previewMobileSummary}>
                Ver prévia
              </summary>
              <div className={styles.previewMobileBody}>{preview}</div>
            </details>

            <div className={styles.edit}>
              <div
                className="admin-layout-picker"
                role="radiogroup"
                aria-label="Modelo da página inicial"
              >
                {SITE_LAYOUT_OPTIONS.map((opt) => {
                  const active = selectedLayout === opt.id;
                  const published = baselineLayout === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`admin-layout-card ${styles.layoutCard}${active ? " admin-layout-card--active" : ""}`}
                      onClick={() =>
                        onConfigChange({ ...config, layout: opt.id })
                      }
                      disabled={disabled}
                    >
                      {active ? (
                        <span
                          className={`${styles.layoutBadge}${layoutDraft ? ` ${styles.layoutBadgeDraft}` : ""}`}
                        >
                          {layoutDraft ? "Selecionado" : "Em uso"}
                        </span>
                      ) : published ? (
                        <span className={styles.layoutBadge}>Publicado</span>
                      ) : null}
                      <div className="admin-layout-card__preview">
                        <LayoutPreview
                          id={opt.id}
                          primaryColor={primaryColor}
                        />
                      </div>
                      <div className="admin-layout-card__meta">
                        <strong>{opt.nome}</strong>
                        <span>{opt.descricao}</span>
                        <span className={styles.layoutImpact}>{opt.impacto}</span>
                        <span className={styles.layoutAreas}>
                          {opt.areasResumo}
                        </span>
                        <ul className={styles.layoutList}>
                          {opt.destaques.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </button>
                  );
                })}
              </div>

              {layoutDraft ? (
                <p className="admin-alert admin-alert--warn" role="status">
                  Modelo em rascunho — clique em <strong>Salvar</strong> para
                  publicar. Banners editáveis só os do modelo ainda publicado (
                  {
                    SITE_LAYOUT_OPTIONS.find((o) => o.id === baselineLayout)
                      ?.nome
                  }
                  ).
                </p>
              ) : null}
            </div>

            <aside className={styles.previewAside}>{preview}</aside>
          </div>
        </section>
      </form>

      <section className="admin-form__section admin-config-vitrine__banners">
        <header className={`admin-form__section-header ${styles.bannersHeader}`}>
          <div>
            <h2 className="admin-form__section-title">
              Áreas de imagem
              <FieldHint text="Cada card numerado corresponde a um marcador na prévia. Imagem salva ao escolher o arquivo. Link e texto do botão pedem Salvar detalhes." />
            </h2>
            <p className="admin-form__section-desc">
              Áreas mudam com o modelo. Use a prévia para localizar cada uma.
            </p>
          </div>
          <p className={styles.bannersAutosave}>Imagens salvam ao enviar</p>
        </header>
        <div className="admin-form__section-body">
          <BannersClient
            initialItems={banners}
            layout={selectedLayout}
            publishedLayout={baselineLayout}
            embedded
            onItemsChange={setBanners}
          />
        </div>
      </section>
    </div>
  );
}
