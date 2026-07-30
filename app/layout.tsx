import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter, Poppins } from "next/font/google";
import "./globals.css";
import "./layout-tokens.css";
import { getCachedSiteConfig } from "@/src/lib/cache/storefront-reads";
import { siteThemeStyle } from "@/src/lib/front/site-theme-css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-lookbook",
});

function bodyFontClass(site: Awaited<ReturnType<typeof getCachedSiteConfig>>) {
  const classes = ["antialiased"];
  if (site.tema.fonteCorpo === "inter") classes.push(inter.variable);
  else classes.push(poppins.variable);
  if (site.tema.fonteDisplay === "bebas-neue") {
    classes.push(bebasNeue.variable);
  } else if (site.tema.fonteDisplay === "poppins") {
    classes.push(poppins.variable);
  } else {
    classes.push(bebasNeue.variable);
  }
  return classes.join(" ");
}

export async function generateMetadata(): Promise<Metadata> {
  const site = await getCachedSiteConfig();
  const iconVersion = site.logo?.id ?? site.versao;
  return {
    title: {
      default: `${site.nomeLoja} — ${site.assinatura}`,
      template: site.seo.titleTemplate.replace("{nomeLoja}", site.nomeLoja),
    },
    description: site.slogan,
    icons: {
      icon: [{ url: `/icon?v=${iconVersion}` }],
      apple: [{ url: `/apple-icon?v=${iconVersion}` }],
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const site = await getCachedSiteConfig();
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: site.cores.primaria,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getCachedSiteConfig();
  const fontVars: React.CSSProperties = { ...siteThemeStyle(site) };
  if (site.tema.fonteCorpo === "inter") {
    (fontVars as Record<string, string>)["--vn-font"] =
      "var(--font-inter), system-ui, sans-serif";
  }
  if (site.tema.fonteDisplay === "system") {
    (fontVars as Record<string, string>)["--vn-font-display"] =
      "system-ui, sans-serif";
  }

  return (
    <html
      lang={site.seo.idioma}
      data-layout={site.layout}
      style={fontVars}
    >
      <body className={bodyFontClass(site)} data-layout={site.layout}>
        {children}
      </body>
    </html>
  );
}
