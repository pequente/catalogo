"use client";

import type { SiteTextosExtended } from "@/src/schemas/site-personalization";
import styles from "./ConsentBanner.module.css";

type Props = {
  copy: SiteTextosExtended["cookies"];
  onAccept: () => void;
  onDecline: () => void;
};

export function ConsentBanner({ copy, onAccept, onDecline }: Props) {
  return (
    <div className={styles.banner} role="dialog" aria-live="polite" aria-label="Cookies">
      <p className={styles.text}>{copy.mensagem}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.decline} onClick={onDecline}>
          {copy.recusar}
        </button>
        <button type="button" className={styles.accept} onClick={onAccept}>
          {copy.aceitar}
        </button>
      </div>
    </div>
  );
}
