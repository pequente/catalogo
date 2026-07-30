import Image from "next/image";
import Link from "next/link";
import { BannerFaixa, BannerPromo } from "@/components/public/BannerSlots";
import { InstagramButton } from "@/components/public/InstagramButton";
import { ProductCard } from "@/components/public/ProductCard";
import { WhatsAppButton } from "@/components/public/WhatsAppButton";
import { mediaUrl } from "@/src/lib/front/format";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import { bannerCtaTexto, bannerHref, pickBanner } from "@/src/lib/front/media";
import type { HomeProps } from "../types";
import styles from "./classic.module.css";

export function ClassicHome({
  site,
  banners,
  destaques,
  novos,
  vitrineFallback,
  wa,
}: HomeProps) {
  const hero = pickBanner(banners, "hero");
  const heroImg = mediaUrl(hero?.imagem.path);
  const heroLink = bannerHref(hero);
  const heroCta = bannerCtaTexto(hero, site.textos.home.verColecao);
  const showFallback =
    destaques.length === 0 && novos.length === 0 && vitrineFallback.length > 0;
  const showWa = site.whatsapp.mostrar;
  const showIg = site.instagram.mostrar;
  const showContactStrip = showWa;
  const home = site.textos.home;
  const produtoCopy = site.textos.produto;

  return (
    <>
      <section className={styles.hero} aria-label="Destaque">
        {heroImg ? (
          <>
            <div className={styles.heroMedia}>
              <Image
                src={heroImg}
                alt={hero?.imagem.alt || site.nomeLoja}
                fill
                priority
                sizes={IMAGE_SIZES.hero}
                className={styles.heroMediaImg}
              />
            </div>
            <div className={styles.heroScrim} aria-hidden="true" />
          </>
        ) : null}
        <div className="container">
          <div className={styles.heroInner}>
            <p className={styles.heroEyebrow}>{site.assinatura}</p>
            <h1 className={styles.heroTitle}>{site.nomeLoja}</h1>
            <p className={styles.heroCopy}>{site.slogan}</p>
            <div className={styles.heroCtas}>
              <Link className={`btn ${styles.heroBtnPrimary}`} href={heroLink}>
                {heroCta}
              </Link>
              {showWa ? (
                <WhatsAppButton
                  href={wa}
                  waSource="home"
                  className="btn btn-whatsapp"
                >
                  {home.whatsappCurto}
                </WhatsAppButton>
              ) : null}
              {showIg ? (
                <InstagramButton href={site.instagram.url} />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {destaques.length > 0 ? (
        <section className={`container ${styles.section}`}>
          <h2 className={`vn-section-title ${styles.sectionTitle}`}>
            {home.destaquesTitulo}
          </h2>
          <div className="grid-products">
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
          <h2 className={`vn-section-title ${styles.sectionTitle}`}>
            {home.fallbackTitulo}
          </h2>
          <div className="grid-products">
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

      <BannerFaixa
        banners={banners}
        storeName={site.nomeLoja}
        className={`banner-faixa ${styles.sectionTight}`}
      />

      {novos.length > 0 ? (
        <section className={`container ${styles.sectionTight}`}>
          <h2 className={`vn-section-title ${styles.sectionTitle}`}>
            {home.lancamentosTitulo}
          </h2>
          <div className="grid-products">
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

      <div className={`container ${styles.sectionTight}`}>
        <BannerPromo
          banners={banners}
          storeName={site.nomeLoja}
          className="banner-promo"
        />
      </div>

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
