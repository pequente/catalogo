"use client";

import {
  Home,
  MessageCircle,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import styles from "./WhatsAppPanel.module.css";

export type StorePreviewSurface = "home" | "produto" | "carrinho";

type Props = {
  storeName?: string;
  whatsappEnabled: boolean;
  cartEnabled: boolean;
  surface?: StorePreviewSurface;
  onSurfaceChange?: (surface: StorePreviewSurface) => void;
};

const TABS: Array<{
  id: StorePreviewSurface;
  label: string;
  Icon: typeof Home;
}> = [
  { id: "home", label: "Home", Icon: Home },
  { id: "produto", label: "Produto", Icon: Package },
  { id: "carrinho", label: "Carrinho", Icon: ShoppingBag },
];

function DeviceChrome({ storeName }: { storeName: string }) {
  return (
    <div className={styles.deviceChrome}>
      <span className={styles.deviceBrand}>{storeName}</span>
      <span className={styles.deviceDots} aria-hidden>
        <span className={styles.deviceDot} />
        <span className={styles.deviceDot} />
        <span className={styles.deviceDot} />
      </span>
    </div>
  );
}

function Cta({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <span
      className={[
        styles.highlightCta,
        !enabled ? styles.highlightCtaMuted : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <MessageCircle size={12} strokeWidth={2.5} />
      {label}
    </span>
  );
}

export function WhatsAppStorePreview({
  storeName = "Minha loja",
  whatsappEnabled,
  cartEnabled,
  surface: controlledSurface,
  onSurfaceChange,
}: Props) {
  const [internal, setInternal] = useState<StorePreviewSurface>("home");
  const surface = controlledSurface ?? internal;

  function setSurface(next: StorePreviewSurface) {
    onSurfaceChange?.(next);
    if (controlledSurface === undefined) setInternal(next);
  }

  const captions: Record<StorePreviewSurface, string> = {
    home: whatsappEnabled
      ? "Na home o botão aparece no destaque e na faixa de dúvidas (e também no rodapé)."
      : "Com o WhatsApp desligado, esses botões somem da loja.",
    produto: whatsappEnabled
      ? "Na página do produto, o cliente usa este botão para mandar interesse com os detalhes escolhidos."
      : "Sem WhatsApp ativo, o botão de interesse não aparece.",
    carrinho: !cartEnabled
      ? "O carrinho está desligado na aba Geral — o cliente não vê esta tela."
      : whatsappEnabled
        ? "No carrinho, um único botão envia todos os itens em uma mensagem."
        : "Com o WhatsApp desligado, o envio do pedido some do carrinho.",
  };

  return (
    <div className={[styles.storePreview, styles.waAccent].join(" ")}>
      <div className={styles.storeTabs} role="tablist" aria-label="Prévia da loja">
        {TABS.map(({ id, label, Icon }) => {
          const selected = surface === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              className={[
                styles.storeTab,
                selected ? styles.storeTabActive : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSurface(id)}
            >
              <Icon size={12} strokeWidth={2.25} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <div className={styles.storeFrame}>
        <div className={styles.device}>
          <DeviceChrome storeName={storeName} />
          <div className={styles.deviceBody}>
            {surface === "home" ? (
              <>
                <div className={[styles.skel, styles.skelHero].join(" ")} />
                <div className={[styles.skel, styles.skelLine].join(" ")} />
                <div className={[styles.skel, styles.skelLineShort].join(" ")} />
                <Cta label="Falar no WhatsApp" enabled={whatsappEnabled} />
                <div className={[styles.skel, styles.skelCard].join(" ")} />
              </>
            ) : null}

            {surface === "produto" ? (
              <>
                <div className={[styles.skel, styles.skelHero].join(" ")} />
                <div className={[styles.skel, styles.skelLine].join(" ")} />
                <div className={[styles.skel, styles.skelLineShort].join(" ")} />
                <div className={styles.productBar}>
                  <Cta
                    label="Tenho interesse"
                    enabled={whatsappEnabled}
                  />
                </div>
              </>
            ) : null}

            {surface === "carrinho" ? (
              <>
                <div className={[styles.skel, styles.skelCard].join(" ")} />
                <div className={[styles.skel, styles.skelCard].join(" ")} />
                <div className={styles.cartFooter}>
                  <div className={[styles.skel, styles.skelLineShort].join(" ")} />
                  <Cta
                    label="Enviar pedido no WhatsApp"
                    enabled={whatsappEnabled && cartEnabled}
                  />
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <p className={styles.storeCaption}>
        <strong>Onde o cliente clica:</strong> {captions[surface]}
      </p>
    </div>
  );
}
