import { Suspense } from "react";
import {
  AdminLoginFormSkeleton,
  AdminLoginShell,
  type AdminLoginBrand,
} from "@/components/admin/AdminLoginShell";
import { mediaUrl } from "@/src/lib/front/format";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import LoginForm from "./LoginForm";

function locationLabel(endereco: {
  mostrar: boolean;
  texto: string;
  cidade: string;
  uf: string;
}): string | null {
  if (!endereco.mostrar) return null;
  const texto = endereco.texto.trim();
  if (texto) return texto;
  const cidade = endereco.cidade.trim();
  const uf = endereco.uf.trim();
  if (cidade && uf) return `${cidade}-${uf}`;
  return cidade || uf || null;
}

export default async function Page() {
  const site = await getCachedSiteConfig();
  const logoUrl = mediaUrl(site.logo?.path);
  const brand: AdminLoginBrand = {
    nomeLoja: site.nomeLoja,
    assinatura: site.assinatura,
    slogan: site.slogan,
    logoUrl,
    logoAlt: site.logo?.alt?.trim() || site.nomeLoja,
    mostrarNomeComLogo: site.mostrarNomeComLogo,
    locationLabel: locationLabel(site.endereco),
  };

  return (
    <AdminLoginShell brand={brand}>
      <Suspense fallback={<AdminLoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </AdminLoginShell>
  );
}
