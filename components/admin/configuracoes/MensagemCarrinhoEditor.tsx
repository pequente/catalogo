"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { cartWaMessage } from "@/src/lib/wa";
import {
  type CartWaTemplateParts,
} from "@/src/lib/wa-cart-template";
import {
  type CompactCartItemParts,
} from "@/src/lib/wa-compact-template";
import { WhatsAppSectionSplit } from "@/components/admin/configuracoes/WhatsAppSectionSplit";
import { WhatsAppStorePreview } from "@/components/admin/configuracoes/WhatsAppStorePreview";
import styles from "@/components/admin/configuracoes/WhatsAppPanel.module.css";
import type { SiteConfig } from "@/src/schemas/site-config";

const PREVIEW_LINES = [
  {
    nome: "Vestido floral",
    slug: "vestido-floral",
    referencia: "12425",
    tamanho: "M",
    cor: "Azul",
    quantidade: 1,
  },
  {
    nome: "Sandália confort",
    slug: "sandalia-confort",
    referencia: "",
    tamanho: "38",
    cor: "Preto",
    quantidade: 2,
  },
] as const;

export function MensagemCarrinhoEditor({
  config,
  disabled,
  previewMuted,
  onConfigChange,
  storeName,
  phoneLabel,
  whatsappEnabled = true,
  cartEnabled = true,
}: {
  config: SiteConfig;
  disabled?: boolean;
  previewMuted?: boolean;
  onConfigChange: (next: SiteConfig) => void;
  storeName?: string;
  phoneLabel?: string;
  whatsappEnabled?: boolean;
  cartEnabled?: boolean;
}) {
  const wa = config.whatsapp;
  const envelopeParts = wa.mensagemCarrinhoParts;
  const compactParts = wa.mensagemCarrinhoItemCompactoParts;
  const incluirReferencia = Boolean(wa.mensagemProdutoIncluirReferencia);

  const preview = useMemo(
    () =>
      cartWaMessage(
        {
          mensagemProdutoParts: wa.mensagemProdutoParts,
          mensagemCarrinhoParts: wa.mensagemCarrinhoParts,
          mensagemCarrinhoItemCompactoParts: wa.mensagemCarrinhoItemCompactoParts,
          mensagemCarrinhoFormatoItens: wa.mensagemCarrinhoFormatoItens,
          mensagemProdutoIncluirReferencia:
            wa.mensagemProdutoIncluirReferencia,
        },
        [...PREVIEW_LINES],
      ),
    [
      wa.mensagemProdutoParts,
      wa.mensagemCarrinhoParts,
      wa.mensagemCarrinhoItemCompactoParts,
      wa.mensagemCarrinhoFormatoItens,
      wa.mensagemProdutoIncluirReferencia,
    ],
  );

  function patchWhatsapp(partial: Partial<SiteConfig["whatsapp"]>) {
    onConfigChange({
      ...config,
      whatsapp: { ...config.whatsapp, ...partial },
    });
  }

  function updateEnvelope(next: CartWaTemplateParts) {
    patchWhatsapp({ mensagemCarrinhoParts: next });
  }

  function updateCompact(next: CompactCartItemParts) {
    patchWhatsapp({ mensagemCarrinhoItemCompactoParts: next });
  }

  return (
    <WhatsAppSectionSplit
      previewLabel="Exemplo com dois produtos"
      previewText={preview}
      previewMuted={previewMuted}
      storeName={storeName}
      phoneLabel={phoneLabel}
      mobileSummary="Ver prévia"
      asideExtra={
        <WhatsAppStorePreview
          storeName={storeName}
          whatsappEnabled={whatsappEnabled}
          cartEnabled={cartEnabled}
          surface="carrinho"
        />
      }
    >
      <div className="wa-product-msg">
        <div className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">
            Como cada item aparece
          </span>
          <p className="wa-product-msg__block-desc">
            O carrinho monta uma lista. Você define se cada item fica igual à
            mensagem de produto ou em linha curta.
          </p>
          <div
            className={styles.formatCards}
            role="radiogroup"
            aria-label="Formato de cada item"
          >
            <label
              className={[
                styles.formatCard,
                wa.mensagemCarrinhoFormatoItens === "produto"
                  ? styles.formatCardSelected
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-disabled={disabled ? "true" : undefined}
            >
              <input
                type="radio"
                name="mensagemCarrinhoFormatoItens"
                checked={wa.mensagemCarrinhoFormatoItens === "produto"}
                disabled={disabled}
                onChange={() =>
                  patchWhatsapp({ mensagemCarrinhoFormatoItens: "produto" })
                }
              />
              <p className={styles.formatCardTitle}>Igual ao de um produto</p>
              <p className={styles.formatCardDesc}>
                Reaproveita título, detalhes e link da seção anterior.
              </p>
            </label>
            <label
              className={[
                styles.formatCard,
                wa.mensagemCarrinhoFormatoItens === "compacto"
                  ? styles.formatCardSelected
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              data-disabled={disabled ? "true" : undefined}
            >
              <input
                type="radio"
                name="mensagemCarrinhoFormatoItens"
                checked={wa.mensagemCarrinhoFormatoItens === "compacto"}
                disabled={disabled}
                onChange={() =>
                  patchWhatsapp({ mensagemCarrinhoFormatoItens: "compacto" })
                }
              />
              <p className={styles.formatCardTitle}>Linha compacta</p>
              <p className={styles.formatCardDesc}>
                Uma linha por item — melhor quando o carrinho tem muitos
                produtos.
              </p>
            </label>
          </div>
        </div>

        {wa.mensagemCarrinhoFormatoItens === "compacto" ? (
          <>
            <div className="wa-product-msg__block">
              <span className="wa-product-msg__block-title">
                Marcação de cada linha
              </span>
              <div
                className={styles.bulletRow}
                role="radiogroup"
                aria-label="Marcação de cada linha"
              >
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
                      name="compactCartBullet"
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
              <p className={styles.includePanelTitle}>Incluir em cada item</p>
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
                A referência é a mesma da seção “Interesse em um produto”.
              </p>
            </div>
          </>
        ) : (
          <div className={styles.includePanel}>
            <p className={styles.includePanelTitle}>Incluir em cada item</p>
            <p className={styles.includePanelDesc}>
              A lista usa o título em negrito da seção “Interesse em um produto”
              (uma vez) e, para cada item, nome, variantes e link conforme as
              opções daquela seção — exceto a referência abaixo, que vale para
              o carrinho e para interesse em um produto.
            </p>
            <div className="wa-product-msg__toggles">
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
          </div>
        )}

        <label className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">Antes da lista</span>
          <span className="wa-product-msg__block-desc">
            Em seguida entra automaticamente a lista de produtos do carrinho.
          </span>
          <input
            className="input"
            disabled={disabled}
            value={envelopeParts.beforeItens}
            onChange={(e) =>
              updateEnvelope({ ...envelopeParts, beforeItens: e.target.value })
            }
          />
        </label>

        <label className="wa-product-msg__block">
          <span className="wa-product-msg__block-title">
            Alguma frase no final? (opcional)
          </span>
          <textarea
            className="textarea"
            rows={2}
            disabled={disabled}
            value={envelopeParts.outro}
            onChange={(e) =>
              updateEnvelope({ ...envelopeParts, outro: e.target.value })
            }
          />
        </label>
      </div>
    </WhatsAppSectionSplit>
  );
}
