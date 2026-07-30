"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { DashSection, DashSectionHeader } from "./DashSection";
import styles from "./DashSectionCollapsible.module.css";
import sectionStyles from "./NegocioPanel.module.css";

type SectionProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleId?: string;
};

type Props = SectionProps & {
  sectionIndex: number;
  children: ReactNode;
  collapseOnMobile?: boolean;
};

function useMobileCollapsible(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767.98px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}

export function DashSectionCollapsible({
  sectionIndex,
  collapseOnMobile = false,
  children,
  title,
  description,
  actions,
  titleId,
}: Props) {
  const mobile = useMobileCollapsible();
  const id = titleId;

  const shouldStartOpen = !collapseOnMobile && sectionIndex === 0;
  const [open, setOpen] = useState(shouldStartOpen);

  useEffect(() => {
    if (!mobile) return;
    setOpen(!collapseOnMobile && sectionIndex === 0);
  }, [mobile, sectionIndex, collapseOnMobile]);

  if (!mobile) {
    return (
      <DashSection
        title={title}
        description={description}
        actions={actions}
        titleId={id}
      >
        {children}
      </DashSection>
    );
  }

  return (
    <section className={sectionStyles.section} aria-labelledby={id}>
      <details
        className={styles.details}
        open={open}
        onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className={styles.summary}>
          <div className={styles.summaryInner}>
            <DashSectionHeader
              title={title}
              description={description}
              actions={actions}
              titleId={id}
            />
          </div>
          <span className={styles.chevron} aria-hidden />
        </summary>
        <div className={styles.body}>{children}</div>
      </details>
    </section>
  );
}
