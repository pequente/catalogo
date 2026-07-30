import Image from "next/image";
import styles from "./AdminLogin.module.css";

export type AdminLoginBrand = {
  nomeLoja: string;
  assinatura: string;
  slogan: string;
  logoUrl: string | null;
  logoAlt: string;
  mostrarNomeComLogo: boolean;
  locationLabel: string | null;
};

type Props = {
  brand: AdminLoginBrand;
  children: React.ReactNode;
};

export function AdminLoginShell({ brand, children }: Props) {
  const showName = !brand.logoUrl || brand.mostrarNomeComLogo;
  const logoAlt = showName ? "" : brand.logoAlt;

  const logo = brand.logoUrl ? (
    <Image
      src={brand.logoUrl}
      alt={logoAlt}
      width={340}
      height={96}
      className={styles.logo}
      sizes="(max-width: 899px) 200px, 340px"
      priority
    />
  ) : null;

  const name = showName ? (
    <h1 className={styles.name}>{brand.nomeLoja.trim()}</h1>
  ) : null;

  return (
    <div className={styles.shell}>
      <aside className={styles.brand} aria-label={brand.nomeLoja.trim()}>
        <div className={styles.brandMain}>
          {brand.logoUrl && showName ? (
            <div className={styles.logoWithName}>
              {logo}
              {name}
            </div>
          ) : (
            <>
              {logo}
              {name}
            </>
          )}
          {brand.assinatura.trim() ? (
            <p className={styles.assinatura}>{brand.assinatura.trim()}</p>
          ) : null}
          {brand.slogan.trim() ? (
            <p className={styles.slogan}>{brand.slogan.trim()}</p>
          ) : null}
        </div>
        {brand.locationLabel ? (
          <p className={styles.location}>{brand.locationLabel}</p>
        ) : null}
      </aside>
      <div className={styles.panel}>{children}</div>
    </div>
  );
}

export function AdminLoginFormSkeleton() {
  return (
    <div className={styles.formSkeleton} aria-busy="true" aria-label="Carregando">
      <div className={styles.skelTitle} />
      <div className={styles.skelLine} />
      <div className={styles.skelField} />
      <div className={styles.skelField} />
      <div className={styles.skelButton} />
    </div>
  );
}
