"use client";

import { useEffect, useState } from "react";

const NEAR_TOP_PX = 80;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fixed “back to top” control for long-scrolling surfaces (lists + Painel).
 * Visible after scrolling ≥ 1 viewport; hidden near top, on click, or via CSS
 * when conflicting fixed UI occupies the bottom area.
 */
export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const maxScroll = document.documentElement.scrollHeight - vh;

      if (maxScroll < vh || y < NEAR_TOP_PX) {
        setVisible(false);
        return;
      }

      setVisible(y >= vh);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(document.documentElement);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, []);

  const onClick = () => {
    setVisible(false);
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <button
      type="button"
      className={["back-to-top", visible ? "is-visible" : null]
        .filter(Boolean)
        .join(" ")}
      aria-label="Voltar ao topo"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={onClick}
    >
      <svg
        className="back-to-top__icon"
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 14l6-6 6 6"
        />
      </svg>
    </button>
  );
}
