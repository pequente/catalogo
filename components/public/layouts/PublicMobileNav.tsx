"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import type { SiteLayoutId } from "./types";
import styles from "./PublicMobileNav.module.css";

/** Stable id — avoid React.useId() (Next 15.5 / React 19 SSR↔CSR mismatch). */
const PANEL_ID = "public-mobile-nav-panel";

export type PublicMobileNavClassNames = {
  root?: string;
  toggle: string;
  toggleOpen?: string;
};

type PublicMobileNavProps = {
  variant: SiteLayoutId;
  classNames: PublicMobileNavClassNames;
  children: ReactNode;
  footer?: ReactNode;
  meta?: ReactNode;
  /** Content rendered between header and nav (e.g. search on split) */
  beforeNav?: ReactNode;
  /** Accessible dialog label + small eyebrow above the title */
  label?: string;
  /** Brand / display title shown in the panel header */
  title?: string;
  subtitle?: string;
};

type DrawerPhase = "closed" | "opening" | "open" | "closing";

function BurgerIcon() {
  return (
    <span className={styles.burger} aria-hidden="true">
      <span className={styles.burgerBar} />
      <span className={styles.burgerBar} />
      <span className={styles.burgerBar} />
    </span>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PublicMobileNav({
  variant,
  classNames,
  children,
  footer,
  meta,
  beforeNav,
  label = "Menu",
  title,
  subtitle,
}: PublicMobileNavProps) {
  const [phase, setPhase] = useState<DrawerPhase>("closed");
  const [mounted, setMounted] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef(false);

  const visible = phase !== "closed";
  const open = phase === "opening" || phase === "open" || phase === "closing";
  const animState = phase === "open" ? "open" : phase === "opening" ? "opening" : "closing";

  const requestClose = useCallback(() => {
    setPhase((prev) => {
      if (prev === "open" || prev === "opening") {
        restoreFocusRef.current = true;
        return "closing";
      }
      return prev;
    });
  }, []);

  const requestOpen = useCallback(() => {
    setPhase((prev) => (prev === "closed" ? "opening" : prev));
  }, []);

  const toggle = useCallback(() => {
    setPhase((prev) => {
      if (prev === "open" || prev === "opening") {
        restoreFocusRef.current = true;
        return "closing";
      }
      if (prev === "closed") return "opening";
      return prev;
    });
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (phase !== "opening") return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setPhase("open"));
    });
    return () => window.cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "closed") return;

    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);

    let focusTimer = 0;
    if (phase === "open") {
      focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40);
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      if (focusTimer) window.clearTimeout(focusTimer);
    };
  }, [phase, requestClose]);

  useEffect(() => {
    if (phase !== "closed" || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    toggleRef.current?.focus({ preventScroll: true });
  }, [phase]);

  useEffect(() => {
    // Classic keeps the drawer mobile-only; split/gallery use it on desktop too.
    if (variant === "split" || variant === "gallery") return;

    const mq = window.matchMedia("(max-width: 767.98px)");
    const onChange = () => {
      if (!mq.matches) {
        restoreFocusRef.current = false;
        setPhase("closed");
      }
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [variant]);

  const onPanelClick = (e: MouseEvent<HTMLElement>) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    if (target.closest("a")) requestClose();
  };

  const onToggleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  };

  const onPanelKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !panelRef.current) return;

    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onPanelTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "transform") return;
    if (phase === "closing") setPhase("closed");
  };

  const toggleClass = [
    classNames.toggle,
    open && classNames.toggleOpen ? classNames.toggleOpen : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rootClass = [styles.root, classNames.root].filter(Boolean).join(" ");
  const panelTitle = title?.trim() || label;

  const drawer =
    visible && mounted
      ? createPortal(
          <>
            <button
              type="button"
              className={styles.overlay}
              data-variant={variant}
              data-state={animState}
              aria-label="Fechar menu"
              tabIndex={-1}
              onClick={requestClose}
            />
            <div
              ref={panelRef}
              id={PANEL_ID}
              className={styles.panel}
              data-variant={variant}
              data-state={animState}
              role="dialog"
              aria-modal="true"
              aria-label={label}
              onKeyDown={onPanelKeyDown}
              onTransitionEnd={onPanelTransitionEnd}
            >
              <div className={styles.header}>
                <div className={styles.headerCopy}>
                  {title ? <span className={styles.eyebrow}>{label}</span> : null}
                  <h2 className={styles.title}>{panelTitle}</h2>
                  {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  className={styles.close}
                  aria-label="Fechar menu"
                  onClick={requestClose}
                >
                  <CloseIcon />
                </button>
              </div>
              {beforeNav ? (
                <div className={styles.beforeNav}>{beforeNav}</div>
              ) : null}
              <nav
                className={styles.nav}
                aria-label="Principal"
                onClick={onPanelClick}
              >
                {children}
              </nav>
              {footer || meta ? (
                <div className={styles.footer} onClick={onPanelClick}>
                  {meta ? <div className={styles.meta}>{meta}</div> : null}
                  {footer ? <div className={styles.footerActions}>{footer}</div> : null}
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={rootClass} data-open={open ? "true" : "false"}>
      <button
        ref={toggleRef}
        type="button"
        className={toggleClass}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={open ? requestClose : requestOpen}
        onKeyDown={onToggleKeyDown}
      >
        <BurgerIcon />
      </button>
      {drawer}
    </div>
  );
}
