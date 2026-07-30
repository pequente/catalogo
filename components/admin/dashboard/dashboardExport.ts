import type { DashboardPeriodPreset } from "@/src/schemas/dashboard";

export function dashboardExportHref(
  preset: DashboardPeriodPreset,
  from: string,
  to: string,
): string {
  const params = new URLSearchParams({ preset });
  if (preset === "custom") {
    params.set("from", from);
    params.set("to", to);
  }
  return `/api/v1/admin/dashboard/export?${params}`;
}
