"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Banner } from "@/src/schemas/banner";
import { mediaUrl } from "@/src/lib/front/format";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import { bannerCtaTexto, bannerHref } from "@/src/lib/front/media";
import styles from "./gallery.module.css";

const AUTOPLAY_MS = 5500;
const SWIPE_THRESHOLD = 48;

type Props = {
  slides: Banner[];
  storeName: string;
  eyebrow: string;
  title: string;
  copy: string;
  verColecao: string;
  catalogHref?: string;
};

export function GalleryCarousel({
  slides,
  storeName,
  eyebrow,
  title,
  copy,
  verColecao,
  catalogHref = "/catalogo",
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const reduceMotion = useRef(false);

  const count = slides.length;
  const safeIndex = count === 0 ? 0 : ((index % count) + count) % count;
  const activeSlide = count > 0 ? slides[safeIndex] : undefined;
  const ctaHref = bannerHref(activeSlide, catalogHref);
  const ctaLabel = bannerCtaTexto(activeSlide, verColecao);

  useEffect(() => {
    reduceMotion.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  function goTo(next: number) {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
  }

  useEffect(() => {
    if (count <= 1 || paused || reduceMotion.current) return;
    const id = window.setInterval(() => {
      setIndex((current) => ((current + 1) % count + count) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [count, paused]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(safeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(safeIndex + 1);
    }
  }

  if (count === 0) {
    return (
      <section className={`${styles.carousel} ${styles.carouselEmpty}`} aria-label="Destaque">
        <div className={`container ${styles.carouselCopy}`}>
          <p className={styles.carouselEyebrow}>{eyebrow}</p>
          <h1 className={styles.carouselTitle}>{title}</h1>
          <p className={styles.carouselText}>{copy}</p>
          <Link className={`btn ${styles.carouselCta}`} href={catalogHref}>
            {verColecao}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={styles.carousel}
      aria-roledescription="carrossel"
      aria-label="Destaques da loja"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <div
        className={styles.carouselTrack}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX;
          if (end == null) return;
          const delta = end - start;
          if (Math.abs(delta) < SWIPE_THRESHOLD) return;
          goTo(safeIndex + (delta < 0 ? 1 : -1));
        }}
      >
        {slides.map((slide, i) => {
          const src = mediaUrl(slide.imagem.path);
          if (!src) return null;
          const active = i === safeIndex;
          return (
            <div
              key={slide.id}
              className={`${styles.carouselSlide}${active ? ` ${styles.carouselSlideActive}` : ""}`}
              aria-hidden={!active}
            >
              <Image
                src={src}
                alt={slide.imagem.alt || storeName}
                fill
                priority={i === 0}
                sizes={IMAGE_SIZES.heroCarousel}
                className={styles.carouselImg}
              />
              <div className={styles.carouselScrim} aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className={`container ${styles.carouselCopy}`}>
        <p className={styles.carouselEyebrow}>{eyebrow}</p>
        <h1 className={styles.carouselTitle}>{title}</h1>
        <p className={styles.carouselText}>{copy}</p>
        <Link className={`btn ${styles.carouselCta}`} href={ctaHref}>
          {ctaLabel}
        </Link>
      </div>

      {count > 1 ? (
        <>
          <div className={styles.carouselControls}>
            <button
              type="button"
              className={styles.carouselArrow}
              aria-label="Slide anterior"
              onClick={() => goTo(safeIndex - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className={styles.carouselArrow}
              aria-label="Próximo slide"
              onClick={() => goTo(safeIndex + 1)}
            >
              ›
            </button>
          </div>
          <div className={styles.carouselDots} role="tablist" aria-label="Slides">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === safeIndex}
                aria-label={`Ir para slide ${i + 1}`}
                className={`${styles.carouselDot}${i === safeIndex ? ` ${styles.carouselDotActive}` : ""}`}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
