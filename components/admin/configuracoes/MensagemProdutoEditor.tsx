"use client";

import { productWaMessageFromParts } from "@/src/lib/wa";
import {
  type ProductWaTemplateParts,
} from "@/src/lib/wa-product-template";
import {
  DEFAULT_COMPACT_CART_ITEM_PARTS,
  type CompactCartItemParts,
} from "@/src/lib/wa-compact-template";
import { DEFAULT_PRODUCT_WA_TEMPLATE_PARTS } from "@/src/lib/wa-product-template";
import { WhatsAppSectionSplit } from "@/components/admin/configuracoes/WhatsAppSectionSplit";
import { WhatsAppStorePreview } from "@/components/admin/configuracoes/WhatsAppStorePreview";
import styles from "@/components/admin/configuracoes/WhatsAppPanel.module.css";
import type { SiteConfig } from "@/src/schemas/site-config";
import { Info } from "lucide-react";
import { useMemo } from "react";

const PREVIEW = {
  nome: "Vestido floral",
  slug: "vestido-floral",
  referencia: "12425",
  tamanho: "M",
  cor: "Azul",
  quantidade: 1,
} as const;

export function MensagemProdutoEditor({
  config,
  disabled,
  onConfigChange,
  storeName,
  phoneLabel,
  whatsappEnabled = true,
  cartEnabled = true,
}: {
  config: SiteConfig;
  disabled?: boolean;
  onConfigChange: (next: SiteConfig) => void;
  storeName?: string;
  phoneLabel?: string;
  whatsappEnabled?: boolean;
  cartEnabled?: boolean;
}) {
  const wa = config.whatsapp;
  const value = wa.mensagemProdutoParts ?? DEFAULT_PRODUCT_WA_TEMPLATE_PARTS;
  const incluirReferencia = Boolean(wa.mensagemProdutoIncluirReferencia);
  const compactParts =
    wa.mensagemProdutoItemCompactoParts ?? DEFAULT_COMPACT_CART_ITEM_PARTS;
  const formatoItens = wa.mensagemProdutoFormatoItens ?? "produto";

  const preview = useMemo(
    () =>
      productWaMessageFromParts(value, PREVIEW.nome, PREVIEW.slug, {
        tamanho: PREVIEW.tamanho,
        cor: PREVIEW.cor,
        quantidade: PREVIEW.quantidade,
        referencia: PREVIEW.referencia,
        mensagemProdutoIncluirReferencia: incluirReferencia,
        formatoItens,
        itemCompactoParts: compactParts,
      }),
    [value, incluirReferencia, formatoItens, compactParts],
  );

  function patchWhatsapp(partial: Partial<SiteConfig["whatsapp"]>) {
    onConfigChange({
      ...config,
      whatsapp: { ...config.whatsapp, ...partial },
    });
  }

  function update(next: ProductWaTemplateParts) {
    patchWhatsapp({ mensagemProdutoParts: next });
  }

  function updateCompact(next: CompactCartItemParts) {
    patchWhatsapp({ mensagemProdutoItemCompactoParts: next });
  }

  return (
    <WhatsAppSectionSplit
      previewLabel="Assim o cliente vai ver"
      previewText={preview}
      storeName={storeName}
      phoneLabel={phoneLabel}
      mobileSummary="Ver prévia"
      asideExtra={
        <WhatsAppStorePreview
          storeName={storeName}
          whatsappEnabled={whatsappEnabled}
          cartEnabled={cartEnabled}
          surface="produto"
        />
      }
    >
      <div className="wa-product-msg">
        <div className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">
            Como o produto aparece na mensagem
          </span>
          <p className="wa-product-msg__block-desc">
            Escolha a aparência da lista. A prévia atualiza na hora.
          </p>
          <div className={styles.formatCards} role="radiogroup" aria-label="Formato do item">
            <label
              className={[
                styles.formatCard,
                formatoItens === "produto" ? styles.formatCardSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-disabled={disabled ? "true" : undefined}
            >
              <input
                type="radio"
                name="mensagemProdutoFormatoItens"
                checked={formatoItens === "produto"}
                disabled={disabled}
                onChange={() =>
                  patchWhatsapp({ mensagemProdutoFormatoItens: "produto" })
                }
              />
              <p className={styles.formatCardTitle}>Lista com marcadores</p>
              <p className={styles.formatCardDesc}>
                Título em destaque e detalhes em linhas. Ideal para ler com
                calma.
              </p>
            </label>
            <label
              className={[
                styles.formatCard,
                formatoItens === "compacto" ? styles.formatCardSelected : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-disabled={disabled ? "true" : undefined}
            >
              <input
                type="radio"
                name="mensagemProdutoFormatoItens"
                checked={formatoItens === "compacto"}
                disabled={disabled}
                onChange={() =>
                  patchWhatsapp({ mensagemProdutoFormatoItens: "compacto" })
                }
              />
              <p className={styles.formatCardTitle}>Linha compacta</p>
              <p className={styles.formatCardDesc}>
                Tudo em poucas linhas — mais curto no celular.
              </p>
            </label>
          </div>
        </div>

        <label className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">Título em negrito</span>
          <span className="wa-product-msg__block-desc">
            Aparece uma vez no topo, em negrito no WhatsApp.
            {formatoItens === "produto"
              ? " O nome do produto vem na lista abaixo."
              : " Em seguida vem uma linha com o produto."}
          </span>
          <input
            className="input"
            disabled={disabled}
            value={value.intro}
            onChange={(e) => update({ ...value, intro: e.target.value })}
          />
        </label>

        {formatoItens === "compacto" ? (
          <>
            <div className="wa-product-msg__block">
              <span className="wa-product-msg__block-title">
                Marcação da linha
              </span>
              <div className={styles.bulletRow} role="radiogroup" aria-label="Marcação da linha">
                {(
                  [
                    ["•", "• Bullet"],
                    ["-", "– Traço"],
                    ["none", "Sem prefixo"],
                  ] as const
                ).map(([bullet, label]) => (
                  <label
                    key={bullet}
                    className={[
                      styles.bulletOption,
                      compactParts.bullet === bullet
                        ? styles.bulletOptionSelected
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <input
                      type="radio"
                      name="compactProductBullet"
                      checked={compactParts.bullet === bullet}
                      disabled={disabled}
                      onChange={() =>
                        updateCompact({ ...compactParts, bullet })
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles.includePanel}>
              <p className={styles.includePanelTitle}>Incluir na linha</p>
              <div className="wa-product-msg__toggles">
                <label
                  className="admin-switch admin-switch--block"
                  data-disabled={disabled ? "true" : undefined}
                >
                  <span>Resumo (tamanho, cor, quantidade)</span>
                  <input
                    type="checkbox"
                    role="switch"
                    disabled={disabled}
                    checked={compactParts.showResumo}
                    onChange={(e) =>
                      updateCompact({
                        ...compactParts,
                        showResumo: e.target.checked,
                      })
                    }
                  />
                  <span className="admin-switch__track" aria-hidden="true" />
                </label>
                <label
                  className="admin-switch admin-switch--block"
                  data-disabled={disabled ? "true" : undefined}
                >
                  <span>Link da página</span>
                  <input
                    type="checkbox"
                    role="switch"
                    disabled={disabled}
                    checked={compactParts.showUrl}
                    onChange={(e) =>
                      updateCompact({
                        ...compactParts,
                        showUrl: e.target.checked,
                      })
                    }
                  />
                  <span className="admin-switch__track" aria-hidden="true" />
                </label>
                <label
                  className="admin-switch admin-switch--block"
                  data-disabled={disabled ? "true" : undefined}
                >
                  <span>Referência do produto (quando cadastrada)</span>
                  <input
                    type="checkbox"
                    role="switch"
                    disabled={disabled}
                    checked={incluirReferencia}
                    aria-label="Incluir referência do produto na mensagem"
                    onChange={(e) =>
                      patchWhatsapp({
                        mensagemProdutoIncluirReferencia: e.target.checked,
                      })
                    }
                  />
                  <span className="admin-switch__track" aria-hidden="true" />
                </label>
              </div>
              <p className={styles.sharedNote}>
                <Info size={14} strokeWidth={2.25} aria-hidden />
                A referência também vale para o pedido pelo carrinho.
              </p>
            </div>
          </>
        ) : (
          <div className={styles.includePanel}>
            <p className={styles.includePanelTitle}>Incluir na mensagem</p>
            <p className={styles.includePanelDesc}>
              Marque o que o cliente deve enviar junto com o interesse.
            </p>
            <div className="wa-product-msg__toggles">
              <label
                className="admin-switch admin-switch--block"
                data-disabled={disabled ? "true" : undefined}
              >
                <span>Tamanho, cor e quantidade</span>
                <input
                  type="checkbox"
                  role="switch"
                  disabled={disabled}
                  checked={value.includeVariantDetails}
                  aria-label="Incluir tamanho, cor e quantidade na mensagem"
                  onChange={(e) =>
                    update({
                      ...value,
                      includeVariantDetails: e.target.checked,
                    })
                  }
                />
                <span className="admin-switch__track" aria-hidden="true" />
              </label>
              <label
                className="admin-switch admin-switch--block"
                data-disabled={disabled ? "true" : undefined}
              >
                <span>Referência do produto (quando cadastrada)</span>
                <input
                  type="checkbox"
                  role="switch"
                  disabled={disabled}
                  checked={incluirReferencia}
                  aria-label="Incluir referência do produto na mensagem"
                  onChange={(e) =>
                    patchWhatsapp({
                      mensagemProdutoIncluirReferencia: e.target.checked,
                    })
                  }
                />
                <span className="admin-switch__track" aria-hidden="true" />
              </label>
              <label
                className="admin-switch admin-switch--block"
                data-disabled={disabled ? "true" : undefined}
              >
                <span>Link da página do produto</span>
                <input
                  type="checkbox"
                  role="switch"
                  disabled={disabled}
                  checked={value.includeUrl}
                  aria-label="Incluir link da página do produto na mensagem"
                  onChange={(e) =>
                    update({ ...value, includeUrl: e.target.checked })
                  }
                />
                <span className="admin-switch__track" aria-hidden="true" />
              </label>
            </div>
            <p className={styles.sharedNote}>
              <Info size={14} strokeWidth={2.25} aria-hidden />
              A referência também vale para o pedido pelo carrinho.
            </p>
          </div>
        )}

        <label className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">
            Alguma pergunta no final? (opcional)
          </span>
          <textarea
            className="textarea"
            rows={2}
            disabled={disabled}
            value={value.outro}
            onChange={(e) => update({ ...value, outro: e.target.value })}
          />
        </label>
      </div>
    </WhatsAppSectionSplit>
  );
}
