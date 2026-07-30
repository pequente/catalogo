"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { BackToTopButton } from "@/components/ui/BackToTopButton";

type Props = {
  children: ReactNode;
};

/**
 * Keeps pagination floating at the viewport bottom while scrolling the list,
 * then anchors it in document flow when the end sentinel enters view
 * (so it does not cover the site footer / content below).
 */
export function PaginationDockShell({ children }: Props) {
  const [floating, setFloating] = useState(true);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFloating(!entry.isIntersecting);
      },
      { threshold: 0, root: null, rootMargin: "0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel]);

  return (
    <>
      <div
        className={[
          "pagination-dock",
          floating ? "pagination-dock--floating" : null,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
      <BackToTopButton />
      <div
        ref={setSentinel}
        className="pagination-dock__sentinel"
        aria-hidden="true"
      />
    </>
  );
}
