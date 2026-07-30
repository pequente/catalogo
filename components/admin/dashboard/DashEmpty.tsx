import type { LucideIcon } from "lucide-react";
import { BarChart3 } from "lucide-react";
import styles from "./NegocioPanel.module.css";
import { DashIcon } from "./icons";

type Props = {
  title?: string;
  text?: string;
};

export function DashEmpty({ title = "Sem dados", text }: Props) {
  return (
    <div className={styles.empty}>
      <BarChart3
        size={28}
        strokeWidth={1.5}
        className={styles.emptyIcon}
        aria-hidden
      />
      <p className={styles.emptyTitle}>{title}</p>
      {text ? <p className={styles.emptyText}>{text}</p> : null}
    </div>
  );
}

export function DashEmptyIcon({
  icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
}) {
  return (
    <div className={styles.empty}>
      <DashIcon icon={icon} className={styles.emptyIcon} />
      <p className={styles.emptyTitle}>{title}</p>
      {text ? <p className={styles.emptyText}>{text}</p> : null}
    </div>
  );
}
