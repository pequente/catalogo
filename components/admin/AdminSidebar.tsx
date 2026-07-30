"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const PANEL_ID = "admin-sidebar-mobile-panel";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
};

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const sections: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        href: "/admin",
        label: "Painel",
        exact: true,
        icon: (
          <svg {...iconProps}>
            <rect x="3" y="3" width="7" height="9" rx="1.5" />
            <rect x="14" y="3" width="7" height="5" rx="1.5" />
            <rect x="14" y="12" width="7" height="9" rx="1.5" />
            <rect x="3" y="16" width="7" height="5" rx="1.5" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Gestão",
    items: [
      {
        href: "/admin/produtos",
        label: "Produtos",
        icon: (
          <svg {...iconProps}>
            <path d="M20.5 7.5 12 3 3.5 7.5v9L12 21l8.5-4.5v-9Z" />
            <path d="M12 12 3.5 7.5M12 12l8.5-4.5M12 12v9" />
          </svg>
        ),
      },
      {
        href: "/admin/categorias",
        label: "Categorias",
        icon: (
          <svg {...iconProps}>
            <path d="M4 7h6v6H4V7Z" />
            <path d="M14 7h6v6h-6V7Z" />
            <path d="M4 17h16" />
          </svg>
        ),
      },
      {
        href: "/admin/clientes",
        label: "Clientes",
        icon: (
          <svg {...iconProps}>
            <circle cx="9" cy="8" r="3" />
            <path d="M3 20c0-3.3 2.7-6 6-6" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M21 20c0-2.5-2-4.5-4.5-4.5" />
          </svg>
        ),
      },
      {
        href: "/admin/pedidos",
        label: "Pedidos",
        icon: (
          <svg {...iconProps}>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h4" />
          </svg>
        ),
      },
    ],
  },
  {
    title: "Ajustes",
    items: [
      {
        href: "/admin/personalizacao",
        label: "Configurações",
        icon: (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2.2M12 18.8V21M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M3 12h2.2M18.8 12H21M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
          </svg>
        ),
      },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function BrandMark({
  storeName,
  logoUrl,
}: {
  storeName: string;
  logoUrl: string | null;
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="admin-sidebar__mark admin-sidebar__mark--logo"
        src={logoUrl}
        alt=""
      />
    );
  }
  const initials = storeName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span className="admin-sidebar__mark" aria-hidden>
      {initials || "VN"}
    </span>
  );
}

export function AdminSidebar({
  logoutAction,
  storeName = "Minha loja",
  logoUrl = null,
}: {
  logoutAction: () => Promise<void>;
  storeName?: string;
  logoUrl?: string | null;
}) {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setPendingHref(null);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (mq.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const nav = (
    <>
      <nav className="admin-sidebar__nav" aria-label="Menu administrativo">
        {sections.map((section) => (
          <div key={section.title} className="admin-sidebar__group">
            <p className="admin-sidebar__section">{section.title}</p>
            {section.items.map((item) => {
              const active = isActive(pathname, item);
              const pending = pendingHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="admin-sidebar__link"
                  data-active={active || pending ? "true" : undefined}
                  data-pending={pending ? "true" : undefined}
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    if (active) return;
                    startTransition(() => {
                      setPendingHref(item.href);
                    });
                  }}
                >
                  <span className="admin-sidebar__icon">{item.icon}</span>
                  <span className="admin-sidebar__label">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="admin-sidebar__footer">
        <form action={logoutAction}>
          <button className="admin-sidebar__logout" type="submit">
            <span className="admin-sidebar__icon" aria-hidden>
              <svg {...iconProps}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <path d="M16 17l5-5-5-5" />
                <path d="M21 12H9" />
              </svg>
            </span>
            <span className="admin-sidebar__label">Sair</span>
          </button>
        </form>
      </div>
    </>
  );

  const drawer =
    open && mounted
      ? createPortal(
        <>
          <button
            type="button"
            className="admin-sidebar__overlay"
            aria-label="Fechar menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
          />
          <div
            id={PANEL_ID}
            className="admin-sidebar admin-sidebar--drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu administrativo"
          >
            <div className="admin-sidebar__brand">
              <BrandMark storeName={storeName} logoUrl={logoUrl} />
              <div className="admin-sidebar__brand-text">
                <strong>{storeName}</strong>
                <span>Painel admin</span>
              </div>
              <button
                type="button"
                className="admin-sidebar__close"
                aria-label="Fechar menu"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
            </div>
            {nav}
          </div>
        </>,
        document.body,
      )
      : null;

  return (
    <>
      <div className="admin-sidebar__mobile-bar">
        <button
          type="button"
          className="admin-sidebar__menu-btn"
          aria-expanded={open}
          aria-controls={PANEL_ID}
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <div className="admin-sidebar__brand">
          <BrandMark storeName={storeName} logoUrl={logoUrl} />
          <div className="admin-sidebar__brand-text">
            <strong>{storeName}</strong>
            <span>Painel admin</span>
          </div>
        </div>
      </div>

      <aside className="admin-sidebar admin-sidebar--desktop">
        <div className="admin-sidebar__brand">
          <BrandMark storeName={storeName} logoUrl={logoUrl} />
          <div className="admin-sidebar__brand-text">
            <strong>{storeName}</strong>
            <span>Painel admin</span>
          </div>
        </div>
        {nav}
      </aside>
      {drawer}
    </>
  );
}
