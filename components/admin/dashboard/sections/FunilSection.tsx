import type { DashboardStats } from "@/src/schemas/dashboard";
import { FunnelStrip } from "../FunnelStrip";
import { DashSectionCollapsible } from "../DashSectionCollapsible";

type Props = {
  stats: DashboardStats;
  sectionIndex: number;
};

export function FunilSection({ stats, sectionIndex }: Props) {
  return (
    <DashSectionCollapsible
      sectionIndex={sectionIndex}
      title="Funil no período"
      description="Não indicam atribuição exata entre cliques e pedidos."
    >
      <FunnelStrip funil={stats.negocio.funil} />
    </DashSectionCollapsible>
  );
}
