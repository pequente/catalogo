"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  ensureSessionId,
  getConsentStatus,
  getSessionId,
  setConsentAccepted,
  setConsentDeclined,
  type ConsentStatus,
} from "@/src/lib/front/analytics-consent";
import { getClientLead } from "@/src/lib/front/client-lead";
import type { AnalyticsEvent, WaSource } from "@/src/schemas/analytics";
import type { SiteTextosExtended } from "@/src/schemas/site-personalization";
import { ConsentBanner } from "./ConsentBanner";

type AnalyticsContextValue = {
  consent: ConsentStatus;
  trackWaClick: (input: { source: WaSource; produtoId?: string }) => void;
  linkClient: (clienteId: string) => void;
};

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

const FLUSH_MS = 15_000;
const HEARTBEAT_MS = 15_000;

function sendBatch(sessionId: string, events: AnalyticsEvent[]) {
  if (!events.length) return;
  const clienteId = getClientLead()?.id;
  const body = JSON.stringify({
    sessionId,
    ...(clienteId ? { clienteId } : {}),
    events,
  });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.sendBeacon === "function"
  ) {
    const blob = new Blob([body], { type: "application/json" });
    const ok = navigator.sendBeacon("/api/v1/analytics", blob);
    if (ok) return;
  }

  void fetch("/api/v1/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* ignore */
  });
}

export function AnalyticsProvider({
  children,
  cookiesCopy,
}: {
  children: ReactNode;
  cookiesCopy: SiteTextosExtended["cookies"];
}) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<ConsentStatus>("unknown");
  const queueRef = useRef<AnalyticsEvent[]>([]);
  const lastTickRef = useRef<number>(Date.now());
  const visibleRef = useRef(true);

  const enqueue = useCallback((event: AnalyticsEvent) => {
    if (getConsentStatus() !== "accepted") return;
    queueRef.current.push(event);
  }, []);

  const flush = useCallback(() => {
    if (getConsentStatus() !== "accepted") {
      queueRef.current = [];
      return;
    }
    const sid = getSessionId() ?? ensureSessionId();
    const events = queueRef.current;
    if (!events.length) return;
    queueRef.current = [];
    sendBatch(sid, events);
  }, []);

  useEffect(() => {
    setConsent(getConsentStatus());
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;
    ensureSessionId();
    enqueue({ type: "pageview", path: pathname || "/" });
  }, [consent, pathname, enqueue]);

  useEffect(() => {
    if (consent !== "accepted") return;

    lastTickRef.current = Date.now();
    visibleRef.current = document.visibilityState === "visible";

    const pushHeartbeat = () => {
      if (!visibleRef.current) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const delta = Math.min(120_000, Math.max(0, now - lastTickRef.current));
      lastTickRef.current = now;
      if (delta > 0) {
        enqueue({ type: "heartbeat", durationMs: delta });
      }
    };

    const flushTimer = window.setInterval(() => {
      pushHeartbeat();
      flush();
    }, FLUSH_MS);

    const heartbeatTimer = window.setInterval(pushHeartbeat, HEARTBEAT_MS);

    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      if (!visible && visibleRef.current) {
        pushHeartbeat();
        flush();
      }
      visibleRef.current = visible;
      lastTickRef.current = Date.now();
    };

    const onPageHide = () => {
      pushHeartbeat();
      flush();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(flushTimer);
      window.clearInterval(heartbeatTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      pushHeartbeat();
      flush();
    };
  }, [consent, enqueue, flush]);

  const trackWaClick = useCallback(
    (input: { source: WaSource; produtoId?: string }) => {
      enqueue({
        type: "wa_click",
        source: input.source,
        ...(input.produtoId ? { produtoId: input.produtoId } : {}),
      });
      flush();
    },
    [enqueue, flush],
  );

  const linkClient = useCallback(
    (clienteId: string) => {
      enqueue({ type: "client_link", clienteId });
      flush();
    },
    [enqueue, flush],
  );

  const onAccept = useCallback(() => {
    setConsentAccepted();
    setConsent("accepted");
  }, []);

  const onDecline = useCallback(() => {
    setConsentDeclined();
    queueRef.current = [];
    setConsent("declined");
  }, []);

  const value = useMemo(
    () => ({ consent, trackWaClick, linkClient }),
    [consent, trackWaClick, linkClient],
  );

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      {consent === "unknown" ? (
        <ConsentBanner
          copy={cookiesCopy}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      ) : null}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const ctx = useContext(AnalyticsContext);
  if (!ctx) {
    throw new Error("useAnalytics must be used within AnalyticsProvider");
  }
  return ctx;
}

export function useAnalyticsOptional() {
  return useContext(AnalyticsContext);
}
