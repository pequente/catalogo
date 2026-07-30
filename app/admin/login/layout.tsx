import { AdminToaster } from "@/components/admin/AdminToaster";

/**
 * Locks the login route to the viewport before CSS modules load,
 * so the document scrollbar never flashes on first paint.
 */
export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="admin-login-root"
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
      }}
    >
      <AdminToaster />
      {children}
    </div>
  );
}
