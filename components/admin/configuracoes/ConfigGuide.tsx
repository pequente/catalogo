"use client";

import { useEffect, useId, useState, type SyntheticEvent } from "react";
import styles from "./ConfigGuide.module.css";

export type ConfigGuideStep = {
  title: string;
  body: string;
};

type Props = {
  guideId: "geral" | "vitrine";
  title?: string;
  steps: ConfigGuideStep[];
  /** Accessible name for the guide region. */
  ariaLabel?: string;
};

function storageKey(guideId: string) {
  return `vina.configGuide.${guideId}`;
}

export function ConfigGuide({
  guideId,
  title = "Como funciona",
  steps,
  ariaLabel,
}: Props) {
  const titleId = useId();
  // Closed on SSR / first paint to avoid hydration mismatch; open after mount if first visit.
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(storageKey(guideId)) === "1";
    } catch {
      dismissed = false;
    }
    setOpen(!dismissed);
    setReady(true);
  }, [guideId]);

  function onToggle(e: SyntheticEvent<HTMLDetailsElement>) {
    const next = e.currentTarget.open;
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(storageKey(guideId), "1");
      } catch {
        /* ignore quota / private mode */
      }
    }
  }

  return (
    <details
      className={styles.guide}
      open={ready ? open : false}
      onToggle={onToggle}
      aria-label={ariaLabel ?? title}
    >
      <summary className={styles.summary}>
        <span id={titleId}>{title}</span>
        <span className={styles.chevron} aria-hidden />
      </summary>
      <div className={styles.body}>
        <ol className={styles.steps}>
          {steps.map((step, i) => (
            <li key={step.title} className={styles.step}>
              <span className={styles.num} aria-hidden>
                {i + 1}
              </span>
              <span className={styles.stepBody}>
                <span className={styles.stepTitle}>{step.title}</span>
                {" — "}
                {step.body}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </details>
  );
}
