"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Product } from "@/src/schemas/product";
import { mediaUrl } from "@/src/lib/front/format";
import { IMAGE_SIZES } from "@/src/lib/front/media-image";
import { sortedProductImages } from "@/src/lib/front/media";

const THUMB_VISIBLE = 5;
const SWIPE_THRESHOLD = 40;

export function ProductGallery({
  product,
  discountPercent: pct = null,
}: {
  product: Product;
  discountPercent?: number | null;
}) {
  const images = sortedProductImages(product);
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const pointerStartX = useRef<number | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const count = images.length;
  const safeIndex = count === 0 ? 0 : Math.min(index, count - 1);
  const active = images[safeIndex];

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const goPrev = useCallback(() => goTo(safeIndex - 1), [goTo, safeIndex]);
  const goNext = useCallback(() => goTo(safeIndex + 1), [goTo, safeIndex]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el || count <= 1) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    }

    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [count, goPrev, goNext]);

  if (count === 0) {
    return (
      <div className="product-gallery">
        <div className="product-gallery__main">
          <span className="product-gallery__placeholder">{product.nome}</span>
          {pct != null ? (
            <span className="badge product-gallery__badge product-gallery__badge--sale">
              -{pct}%
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const showOverflow = !expanded && count > THUMB_VISIBLE;
  const visibleThumbs = showOverflow
    ? images.slice(0, THUMB_VISIBLE - 1)
    : images;
  const overflowCount = showOverflow ? count - (THUMB_VISIBLE - 1) : 0;

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (count <= 1) return;
    pointerStartX.current = e.clientX;
  }

  function onPointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerStartX.current == null || count <= 1) return;
    const delta = e.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(delta) < SWIPE_THRESHOLD) return;
    if (delta < 0) goNext();
    else goPrev();
  }

  function onPointerCancel() {
    pointerStartX.current = null;
  }

  return (
    <div className="product-gallery">
      <div
        ref={mainRef}
        className="product-gallery__main"
        tabIndex={0}
        role="region"
        aria-roledescription="carrossel"
        aria-label={`Fotos de ${product.nome}`}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <div
          className="product-gallery__track"
          style={{ transform: `translateX(-${safeIndex * 100}%)` }}
        >
          {images.map((img, i) => {
            const src = mediaUrl(img.path);
            return (
              <div key={img.id} className="product-gallery__slide">
                {src ? (
                  <Image
                    src={src}
                    alt={img.alt || product.nome}
                    fill
                    sizes={IMAGE_SIZES.gallery}
                    priority={i === 0}
                    draggable={false}
                    className="product-gallery__img"
                  />
                ) : (
                  <span className="product-gallery__placeholder">
                    {product.nome}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {pct != null ? (
          <span className="badge product-gallery__badge product-gallery__badge--sale">
            -{pct}%
          </span>
        ) : null}

        {count > 1 ? (
          <>
            <button
              type="button"
              className="product-gallery__nav product-gallery__nav--prev"
              aria-label="Foto anterior"
              onClick={goPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="product-gallery__nav product-gallery__nav--next"
              aria-label="Próxima foto"
              onClick={goNext}
            >
              ›
            </button>
            <div className="product-gallery__counter" aria-live="polite">
              {safeIndex + 1} / {count}
            </div>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="product-gallery__thumbs" role="group" aria-label="Miniaturas">
          {visibleThumbs.map((img, i) => {
            const src = mediaUrl(img.path);
            if (!src) return null;
            const isActive = img.id === active?.id;
            return (
              <button
                key={img.id}
                type="button"
                className={`product-gallery__thumb${isActive ? " product-gallery__thumb--active" : ""}`}
                aria-label={img.alt || `Imagem ${i + 1}`}
                aria-pressed={isActive}
                onClick={() => setIndex(images.findIndex((x) => x.id === img.id))}
              >
                <Image
                  src={src}
                  alt=""
                  width={64}
                  height={64}
                  sizes={IMAGE_SIZES.galleryThumb}
                  className="product-gallery__thumb-img"
                />
              </button>
            );
          })}
          {showOverflow ? (
            <button
              type="button"
              className="product-gallery__more"
              aria-label={`Mostrar mais ${overflowCount} fotos`}
              onClick={() => setExpanded(true)}
            >
              +{overflowCount} fotos
            </button>
          ) : null}
          {expanded && count > THUMB_VISIBLE ? (
            <button
              type="button"
              className="product-gallery__more product-gallery__more--collapse"
              aria-label="Ocultar fotos extras"
              onClick={() => setExpanded(false)}
            >
              −
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
