import type { ReactNode } from "react";
import { WaMessagePreview } from "@/components/admin/configuracoes/WaMessagePreview";
import styles from "./WhatsAppPanel.module.css";

type Props = {
  children: ReactNode;
  previewLabel: string;
  previewText: string;
  previewNote?: string;
  previewMuted?: boolean;
  storeName?: string;
  phoneLabel?: string;
  /** Extra content stacked under the message bubble (e.g. store mockup). */
  asideExtra?: ReactNode;
  mobileSummary?: string;
};

export function WhatsAppSectionSplit({
  children,
  previewLabel,
  previewText,
  previewNote,
  previewMuted,
  storeName,
  phoneLabel,
  asideExtra,
  mobileSummary = "Ver prévia",
}: Props) {
  const previewProps = {
    label: previewLabel,
    text: previewText,
    note: previewNote,
    storeName,
    phoneLabel,
  };

  return (
    <div className={[styles.split, styles.waAccent].join(" ")}>
      <details className={styles.previewMobile}>
        <summary className={styles.previewMobileSummary}>{mobileSummary}</summary>
        <div className={styles.previewMobileBody}>
          <div
            className={[
              styles.previewStack,
              previewMuted ? styles.previewStackMuted : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <WaMessagePreview {...previewProps} live={false} />
            {asideExtra}
          </div>
        </div>
      </details>

      <div className={styles.edit}>{children}</div>

      <aside
        className={[
          styles.previewAside,
          previewMuted ? styles.previewAsideMuted : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <WaMessagePreview {...previewProps} live />
        {asideExtra}
      </aside>
    </div>
  );
}
