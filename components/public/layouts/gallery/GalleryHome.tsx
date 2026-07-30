import Link from "next/link";
import { ProductCard } from "@/components/public/ProductCard";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { bannersByPosicao } from "@/src/lib/front/media";
import { buildCategoryTree } from "@/src/lib/categories-tree";
import type { HomeProps } from "../types";
import { GalleryCarousel } from "./GalleryCarousel";
import styles from "./gallery.module.css";

export function GalleryHome({
  site,
  categories,
  banners,
  destaques,
  novos,
  vitrineFallback,
  wa,
}: HomeProps) {
  const slides = bannersByPosicao(banners, "hero");
  const showFallback =
    destaques.length === 0 && novos.length === 0 && vitrineFallback.length > 0;
  const showWa = site.whatsapp.mostrar;
  const showContactStrip = showWa;
  const home = site.textos.home;
  const produtoCopy = site.textos.produto;
  const rootCategories = buildCategoryTree(categories);

  return (
    <>
      <GalleryCarousel
        slides={slides}
        storeName={site.nomeLoja}
        eyebrow={site.assinatura}
        title={site.nomeLoja}
        copy={site.slogan}
        verColecao={home.verColecao}
      />

      {destaques.length > 0 ? (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{home.destaquesTitulo}</h2>
            <Link className={styles.sectionLink} href="/catalogo">
              {home.verTudo}
            </Link>
          </div>
          <div className={`grid-products ${styles.productGrid}`}>
            {destaques.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                cartEnabled={site.mostrarCarrinho}
                copy={produtoCopy}
              />
            ))}
          </div>
        </section>
      ) : null}

      {showFallback ? (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{home.fallbackTitulo}</h2>
            <Link className={styles.sectionLink} href="/catalogo">
              {home.verTudo}
            </Link>
          </div>
          <div className={`grid-products ${styles.productGrid}`}>
            {vitrineFallback.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                cartEnabled={site.mostrarCarrinho}
                copy={produtoCopy}
              />
            ))}
          </div>
        </section>
      ) : null}

      {rootCategories.length > 0 ? (
        <section className={styles.categories} aria-label={site.rotulos.navCategorias}>
          <div className={`container ${styles.categoriesInner}`}>
            <h2 className={styles.categoriesTitle}>{site.rotulos.navCategorias}</h2>
            <div className={styles.categoryList}>
              {rootCategories.map((c) => (
                <Link
                  key={c.id}
                  className={styles.categoryChip}
                  href={`/catalogo?categoria=${c.slug}`}
                >
                  {c.nome}
                </Link>
              ))}
              <Link className={styles.categoryChipAll} href="/catalogo">
                {home.verColecao}
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {novos.length > 0 ? (
        <section className={`container ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{home.lancamentosTitulo}</h2>
            <Link className={styles.sectionLink} href="/catalogo">
              {home.verTudo}
            </Link>
          </div>
          <div className={`grid-products ${styles.productGrid}`}>
            {novos.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                cartEnabled={site.mostrarCarrinho}
                copy={produtoCopy}
              />
            ))}
          </div>
        </section>
      ) : null}

      {showContactStrip ? (
        <section className={`container ${styles.sectionTight}`}>
          <div className={styles.waStrip}>
            <div>
              <h2>{home.duvidasTitulo}</h2>
              <p>{home.duvidasTexto}</p>
            </div>
            <div className="contact-actions">
              <WhatsAppButton href={wa} waSource="home_strip">
                {home.whatsappChamar}
              </WhatsAppButton>
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
