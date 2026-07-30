import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { DeltaBadge } from "./DeltaBadge";
import styles from "./NegocioPanel.module.css";
import { DashIcon } from "./icons";

type Variant = "hero" | "compact" | "caution";

type Props = {
  label: string;
  value: ReactNode;
  deltaPct?: number | null;
  href?: string;
  variant?: Variant;
  icon?: LucideIcon;
};

export function KpiCard({
  label,
  value,
  deltaPct,
  href,
  variant = "compact",
  icon,
}: Props) {
  const variantClass =
    variant === "hero"
      ? styles.kpiHero
      : variant === "caution"
        ? styles.kpiCaution
        : styles.kpiCompact;

  const iconClass =
    variant === "caution"
      ? styles.kpiIconCaution
      : variant === "hero"
        ? styles.kpiIconHero
        : styles.kpiIcon;

  const inner = (
    <>
      <div className={styles.kpiHead}>
        {icon ? <DashIcon icon={icon} className={iconClass} /> : null}
        <span className={styles.kpiLabel}>{label}</span>
      </div>
      <strong className={styles.kpiValue}>{value}</strong>
      {deltaPct !== undefined ? <DeltaBadge deltaPct={deltaPct} /> : null}
    </>
  );

  const className = [styles.kpi, variantClass, href ? styles.kpiLink : ""]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link className={className} href={href}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
