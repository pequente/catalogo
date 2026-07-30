import { AdminBusyProvider } from "@/components/admin/AdminBusy";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminToaster } from "@/components/admin/AdminToaster";
import { ConfirmProvider } from "@/components/admin/ConfirmDialog";
import { mediaUrl } from "@/src/lib/front/format";
import { getCachedSiteBranding } from "@/src/lib/cache/storefront-reads";
import { clearSession } from "@/src/lib/auth/session";
import { DEFAULT_SITE_CONFIG } from "@/src/config/default-site-config";
import { redirect } from "next/navigation";

/**
 * Admin is always request-time: auth cookie + GitHub-backed reads.
 * A static layout under a force-dynamic page can crash as Vercel's bare 500.
 */
export const dynamic = "force-dynamic";

async function logout() {
  "use server";
  await clearSession();
  redirect("/admin/login");
}

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let storeName = DEFAULT_SITE_CONFIG.nomeLoja;
  let logoUrl: string | null = null;
  try {
    const site = await getCachedSiteBranding();
    storeName = site.nomeLoja;
    logoUrl = mediaUrl(site.logo?.path);
  } catch (e) {
    console.error("[admin-layout] branding unavailable", e);
  }

  return (
    <ConfirmProvider>
      <AdminBusyProvider>
        <AdminToaster />
        <div className="admin-shell">
          <AdminSidebar
            logoutAction={logout}
            storeName={storeName}
            logoUrl={logoUrl}
          />
          <div className="admin-main">{children}</div>
        </div>
      </AdminBusyProvider>
    </ConfirmProvider>
  );
}
