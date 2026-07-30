"use client";

import type { ReactNode } from "react";
import styles from "./ConfigPreviewSplit.module.css";

type Props = {
  edit: ReactNode;
  /** Desktop aside preview (live). */
  preview: ReactNode;
  /** Optional distinct mobile preview; defaults to `preview`. */
  mobilePreview?: ReactNode;
  summary?: string;
  className?: string;
  asideClassName?: string;
};

/**
 * Form + live preview: sticky aside on wide sections, collapsed
 * “Ver prévia” details on narrow viewports.
 */
export function ConfigPreviewSplit({
  edit,
  preview,
  mobilePreview,
  summary = "Ver prévia",
  className,
  asideClassName,
}: Props) {
  const mobile = mobilePreview ?? preview;

  return (
    <div className={[styles.split, className].filter(Boolean).join(" ")}>
      <details className={styles.previewMobile}>
        <summary className={styles.previewMobileSummary}>{summary}</summary>
        <div className={styles.previewMobileBody}>{mobile}</div>
      </details>
      <div className={styles.edit}>{edit}</div>
      <aside
        className={[styles.previewAside, asideClassName]
          .filter(Boolean)
          .join(" ")}
      >
        {preview}
      </aside>
    </div>
  );
}
