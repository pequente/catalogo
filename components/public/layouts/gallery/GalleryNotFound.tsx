import Link from "next/link";
import type { NotFoundProps } from "../types";
import styles from "./gallery.module.css";

export function GalleryNotFound({ site }: NotFoundProps) {
  const p = site.textos.paginas;
  return (
    <section className={`container ${styles.notFound}`} aria-labelledby="not-found-title">
      <h1 id="not-found-title" className={styles.notFoundTitle}>
        {p.notFoundTitulo}
      </h1>
      <p className={styles.notFoundCopy}>{p.notFoundTexto}</p>
      <div className={styles.notFoundCtas}>
        <Link className={`btn ${styles.notFoundBtnPrimary}`} href="/">
          {p.notFoundCtaInicio}
        </Link>
        <Link className={`btn ${styles.notFoundBtnSecondary}`} href="/catalogo">
          {p.notFoundCtaCatalogo}
        </Link>
      </div>
    </section>
  );
}
