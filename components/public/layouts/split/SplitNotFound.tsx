import Link from "next/link";
import type { NotFoundProps } from "../types";
import { FootMark } from "./FootMark";
import styles from "./split.module.css";

export function SplitNotFound({ site }: NotFoundProps) {
  const p = site.textos.paginas;
  return (
    <section className={styles.notFound} aria-labelledby="not-found-title">
      <div className={`container ${styles.notFoundInner}`}>
        <div className={styles.notFoundCopyBlock}>
          <h1 id="not-found-title" className={styles.notFoundTitle}>
            {p.notFoundTitulo}
          </h1>
          <p className={styles.notFoundText}>{p.notFoundTexto}</p>
          <div className={styles.notFoundCtas}>
            <Link className={`btn btn-primary ${styles.notFoundBtnPrimary}`} href="/">
              {p.notFoundCtaInicio}
            </Link>
            <Link className={`btn btn-dark ${styles.notFoundBtnSecondary}`} href="/catalogo">
              {p.notFoundCtaCatalogo}
            </Link>
          </div>
        </div>
        <div className={styles.notFoundVisual} aria-hidden="true">
          <FootMark className={styles.notFoundMark} />
        </div>
      </div>
    </section>
  );
}
