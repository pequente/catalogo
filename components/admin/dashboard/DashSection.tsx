import type { ReactNode } from "react";
import styles from "./NegocioPanel.module.css";

export type DashSectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  titleId?: string;
};

export function DashSectionHeader({
  title,
  description,
  actions,
  titleId,
}: DashSectionHeaderProps) {
  const id = titleId;
  return (
    <div className={styles.sectionHead}>
      <div className={styles.sectionIntro}>
        <h3 className={styles.sectionTitle} id={id}>
          {title}
        </h3>
        {description ? (
          <p className={styles.sectionDesc}>{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className={styles.sectionActions}>{actions}</div>
      ) : null}
    </div>
  );
}

type Props = DashSectionHeaderProps & {
  children: ReactNode;
  titleId?: string;
};

export function DashSection({
  title,
  description,
  actions,
  children,
  titleId,
}: Props) {
  const id = titleId;
  return (
    <section className={styles.section} aria-labelledby={id}>
      <DashSectionHeader
        title={title}
        description={description}
        actions={actions}
        titleId={id}
      />
      {children}
    </section>
  );
}
