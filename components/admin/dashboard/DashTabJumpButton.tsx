import type { ReactNode } from "react";
import type { DashboardTabId } from "./dashboardTabs";

type Props = {
  tab: DashboardTabId;
  children: ReactNode;
  className?: string;
  onNavigateTab: (tab: DashboardTabId) => void;
};

export function DashTabJumpButton({
  tab,
  children,
  className,
  onNavigateTab,
}: Props) {
  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost btn-sm"}
      onClick={() => onNavigateTab(tab)}
    >
      {children}
    </button>
  );
}
