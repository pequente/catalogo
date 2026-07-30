import Image from "next/image";
import { mediaUrl } from "@/src/lib/front/format";
import type { SiteConfig } from "@/src/schemas/site-config";
import styles from "./StoreBrand.module.css";

type Props = {
  site: Pick<
    SiteConfig,
    "nomeLoja" | "assinatura" | "logo" | "mostrarNomeComLogo"
  >;
  classNames: {
    name: string;
    tag: string;
    logo: string;
  };
  /** Prefer logo mark when present; keep text name as fallback. */
  showTag?: boolean;
};

export function StoreBrand({ site, classNames, showTag = true }: Props) {
  const src = mediaUrl(site.logo?.path);
  const alt = site.logo?.alt?.trim() || site.nomeLoja;
  const showName = !src || site.mostrarNomeComLogo;

  const logo = src ? (
    <Image
      src={src}
      alt={showName ? "" : alt}
      width={200}
      height={48}
      className={classNames.logo}
      sizes="160px"
      priority
    />
  ) : null;

  const name = showName ? (
    <div className={classNames.name}>{site.nomeLoja}</div>
  ) : null;

  return (
    <>
      {src && showName ? (
        <div className={styles.mark}>
          {logo}
          {name}
        </div>
      ) : (
        <>
          {logo}
          {name}
        </>
      )}
      {showTag ? <div className={classNames.tag}>{site.assinatura}</div> : null}
    </>
  );
}
