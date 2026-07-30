import { Suspense } from "react";
import { DashboardClient } from "@/components/admin/DashboardClient";
import {
  getDashboardStats,
  periodForPreset,
} from "@/src/services/dashboard.service";

export default async function AdminDashboardPage() {
  const period = periodForPreset("7d");
  const stats = await getDashboardStats(period.from, period.to);
  return (
    <Suspense fallback={null}>
      <DashboardClient initial={{ ...stats, preset: "7d" }} />
    </Suspense>
  );
}
