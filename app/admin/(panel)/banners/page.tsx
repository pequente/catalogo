import { redirect } from "next/navigation";

export default function AdminBannersPage() {
  redirect("/admin/personalizacao?tab=vitrine");
}
