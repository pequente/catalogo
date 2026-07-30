"use client";

import type { ReactNode } from "react";
import { useWhatsAppGate } from "@/components/public/WhatsAppGateProvider";
import { useAnalyticsOptional } from "@/components/public/analytics/AnalyticsProvider";
import { WhatsAppIcon } from "@/components/public/icons/StorefrontIcons";
import type { WaSource } from "@/src/schemas/analytics";

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  idle?: boolean;
  showIcon?: boolean;
  ariaLabel?: string;
  waSource?: WaSource;
  produtoId?: string;
};

function WaContent({
  showIcon,
  children,
}: {
  showIcon: boolean;
  children: ReactNode;
}) {
  return (
    <>
      {showIcon ? (
        <WhatsAppIcon size={18} className="btn__icon" />
      ) : null}
      {children}
    </>
  );
}

export function WhatsAppButton({
  href,
  children,
  className = "btn btn-whatsapp",
  disabled = false,
  idle = false,
  showIcon = true,
  ariaLabel,
  waSource,
  produtoId,
}: Props) {
  const { requestWhatsApp } = useWhatsAppGate();
  const analytics = useAnalyticsOptional();

  const idleClass = idle ? " product-detail__wa--idle" : "";
  const disabledClass =
    disabled && !idle ? " product-detail__wa--disabled" : "";

  if (disabled || !href) {
    return (
      <button
        type="button"
        className={`${className}${idleClass}${disabledClass}`.trim()}
        disabled
        aria-disabled="true"
        aria-label={ariaLabel}
      >
        <WaContent showIcon={showIcon}>{children}</WaContent>
      </button>
    );
  }

  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.preventDefault();
        if (waSource && analytics?.consent === "accepted") {
          analytics.trackWaClick({
            source: waSource,
            ...(produtoId ? { produtoId } : {}),
          });
        }
        requestWhatsApp(href);
      }}
    >
      <WaContent showIcon={showIcon}>{children}</WaContent>
    </a>
  );
}
